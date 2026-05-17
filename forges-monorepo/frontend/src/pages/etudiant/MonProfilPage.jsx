import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { etudiantApi } from '../../api/espace-etudiant.api';
import { authApi } from '../../api/auth.api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/feedback/Spinner';

const LANGUES = [
  { value: 'FR', label: 'Français' },
  { value: 'EN', label: 'English' },
  { value: 'ES', label: 'Español' },
  { value: 'PT', label: 'Português' },
];

const SECTEURS = [
  'Agriculture', 'Banque / Finance', 'BTP / Construction', 'Commerce / Distribution',
  'Communication / Médias', 'Éducation / Formation', 'Énergie', 'Informatique / Numérique',
  'Industrie / Manufacture', 'Logistique / Transport', 'Santé / Médical',
  'Télécommunications', 'Tourisme / Hôtellerie', 'Autre',
];

const NIVEAUX_ETUDE = [
  'Sans diplôme', 'BEPC / Brevet', 'BAC / Baccalauréat', 'BAC+2 / BTS / DUT',
  'BAC+3 / Licence', 'BAC+4 / Maîtrise', 'BAC+5 / Master', 'Doctorat',
];

function getInitials(profile) {
  const nom = profile?.nom || '';
  const prenom = profile?.prenom || profile?.prenoms || '';
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase() || '?';
}

function FieldRow({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-subtext">{label}</p>
      <p className="mt-1 font-medium text-text">{value || <span className="text-subtext/60 italic">Non renseigné</span>}</p>
    </div>
  );
}

export default function MonProfilPage() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    pays_residence: '',
    pays_nationalite: '',
    langue_preferee: 'FR',
    secteur_activite: '',
    niveau_etude: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');

  const { execute, isLoading } = useApi();
  const { execute: executePassword, isLoading: isChangingPassword } = useApi();
  const { showToast } = useToast();

  const normalizeProfile = (payload = {}) => {
    const source = payload?.apprenant || payload?.data?.apprenant || payload?.data || payload;
    return {
      ...source,
      prenom: source?.prenom || source?.prenoms || '',
      prenoms: source?.prenoms || source?.prenom || '',
      pays_residence: source?.pays_residence || source?.pays_iso || '',
    };
  };

  const toFormData = (data = {}) => ({
    nom: data.nom || '',
    prenom: data.prenom || data.prenoms || '',
    pays_residence: data.pays_residence || '',
    pays_nationalite: data.pays_nationalite || '',
    langue_preferee: data.langue_preferee || 'FR',
    secteur_activite: data.secteur_activite || '',
    niveau_etude: data.niveau_etude || '',
  });

  const loadProfile = async () => {
    await execute(() => etudiantApi.getProfil(), {
      onSuccess: (data) => {
        const p = normalizeProfile(data);
        setProfile(p);
        setFormData(toFormData(p));
      },
    });
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleField = (field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setFormData((cur) => ({ ...cur, [field]: value ?? '' }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await execute(() => etudiantApi.updateProfil(formData), {
      onSuccess: (data) => {
        const p = normalizeProfile(data);
        setProfile(p);
        setFormData(toFormData(p));
        updateUser({ ...user, ...p });
        setIsEditing(false);
        showToast('Profil mis à jour avec succès', 'success');
      },
      onError: (err) => {
        showToast(err?.message || 'Erreur lors de la mise à jour', 'error');
      },
    });
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (!/[A-Z]/.test(passwordData.newPassword)) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins une majuscule.');
      return;
    }
    if (!/[0-9]/.test(passwordData.newPassword)) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins un chiffre.');
      return;
    }

    await executePassword(
      () => authApi.changePassword(passwordData.currentPassword, passwordData.newPassword),
      {
        onSuccess: () => {
          setShowPasswordForm(false);
          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
          showToast('Mot de passe modifié avec succès', 'success');
        },
        onError: (err) => {
          setPasswordError(err?.message || 'Mot de passe actuel incorrect.');
        },
      }
    );
  };

  const langueLabel = (code) => LANGUES.find((l) => l.value === code)?.label || code;

  const typeLabel = (type) => (type === 'PROFESSIONNEL' ? 'Professionnel' : 'Apprenant scolarisé');

  if (!profile && isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-primary to-secondary p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl font-bold text-white">
            {getInitials(profile)}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Mon profil</p>
            <h1 className="mt-1 text-2xl font-bold">
              {profile?.prenom || profile?.prenoms || ''} {profile?.nom || ''}
            </h1>
            <p className="mt-0.5 text-sm text-white/80">{profile?.email || user?.email || ''}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 md:col-span-2">

          {/* Informations personnelles */}
          <Card>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-primary">Informations personnelles</h2>
              {!isEditing && (
                <Button variant="outline" size="small" onClick={() => setIsEditing(true)}>
                  Modifier
                </Button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Nom"
                    value={formData.nom}
                    onChange={handleField('nom')}
                    required
                    data-testid="profil-nom"
                  />
                  <Input
                    label="Prénoms"
                    value={formData.prenom}
                    onChange={handleField('prenom')}
                    required
                    data-testid="profil-prenom"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-text">
                      Pays de résidence <span className="text-subtext">(code ISO)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.pays_residence}
                      onChange={handleField('pays_residence')}
                      maxLength={2}
                      placeholder="CI"
                      className="w-full rounded-lg border border-border px-4 py-2.5 uppercase text-sm focus:border-primary focus:outline-none"
                      data-testid="profil-pays-residence"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-text">
                      Pays de nationalité <span className="text-subtext">(code ISO)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.pays_nationalite}
                      onChange={handleField('pays_nationalite')}
                      maxLength={2}
                      placeholder="CI"
                      className="w-full rounded-lg border border-border px-4 py-2.5 uppercase text-sm focus:border-primary focus:outline-none"
                      data-testid="profil-pays-nationalite"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text">Langue préférée</label>
                  <select
                    value={formData.langue_preferee}
                    onChange={handleField('langue_preferee')}
                    className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                    data-testid="profil-langue"
                  >
                    {LANGUES.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>

                {profile?.type_apprenant === 'PROFESSIONNEL' && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-text">Secteur d'activité</label>
                    <select
                      value={formData.secteur_activite}
                      onChange={handleField('secteur_activite')}
                      className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                      data-testid="profil-secteur"
                    >
                      <option value="">Sélectionner un secteur</option>
                      {SECTEURS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}

                {profile?.type_apprenant === 'APPRENANT' && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-text">Niveau d'étude</label>
                    <select
                      value={formData.niveau_etude}
                      onChange={handleField('niveau_etude')}
                      className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                      data-testid="profil-niveau-etude"
                    >
                      <option value="">Sélectionner un niveau</option>
                      {NIVEAUX_ETUDE.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData(toFormData(profile));
                    }}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" variant="primary" loading={isLoading}>
                    Enregistrer
                  </Button>
                </div>
              </form>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <FieldRow label="Nom" value={profile?.nom} />
                <FieldRow label="Prénoms" value={profile?.prenom || profile?.prenoms} />
                <FieldRow label="Email" value={profile?.email} />
                <FieldRow label="Langue préférée" value={langueLabel(profile?.langue_preferee)} />
                <FieldRow label="Pays de résidence" value={profile?.pays_residence} />
                <FieldRow label="Pays de nationalité" value={profile?.pays_nationalite} />
                {profile?.type_apprenant === 'PROFESSIONNEL' && (
                  <FieldRow label="Secteur d'activité" value={profile?.secteur_activite} />
                )}
                {profile?.type_apprenant === 'APPRENANT' && (
                  <FieldRow label="Niveau d'étude" value={profile?.niveau_etude} />
                )}
              </div>
            )}
          </Card>

          {/* Sécurité */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-primary">Sécurité</h2>
              {!showPasswordForm && (
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => setShowPasswordForm(true)}
                  data-testid="btn-changer-mdp"
                >
                  Changer le mot de passe
                </Button>
              )}
            </div>

            {showPasswordForm ? (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <Input
                  label="Mot de passe actuel"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData((c) => ({ ...c, currentPassword: e.target.value }))}
                  required
                  data-testid="current-password"
                />
                <Input
                  label="Nouveau mot de passe"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData((c) => ({ ...c, newPassword: e.target.value }))}
                  required
                  helperText="Minimum 8 caractères, une majuscule, un chiffre"
                  data-testid="new-password"
                />
                <Input
                  label="Confirmer le nouveau mot de passe"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData((c) => ({ ...c, confirmPassword: e.target.value }))}
                  required
                  data-testid="confirm-password"
                />

                {passwordError && (
                  <div className="rounded-lg border border-danger bg-danger/10 p-3 text-sm text-danger" data-testid="password-error">
                    {passwordError}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      setPasswordError('');
                    }}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" variant="primary" loading={isChangingPassword}>
                    Confirmer
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-subtext">
                Votre mot de passe est chiffré. Nous vous recommandons de le renouveler régulièrement.
              </p>
            )}
          </Card>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          <Card>
            <h3 className="mb-4 text-sm font-semibold text-primary">Informations de compte</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-subtext">Statut</p>
                <div className="mt-1">
                  <Badge variant={profile?.statut === 'ACTIF' ? 'success' : 'warning'}>
                    {profile?.statut === 'ACTIF' ? 'Actif' : (profile?.statut || 'Inconnu')}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-subtext">Type</p>
                <p className="mt-1 font-medium text-text">
                  {profile?.type_apprenant ? typeLabel(profile.type_apprenant) : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-subtext">Membre depuis</p>
                <p className="mt-1 font-medium text-text">
                  {profile?.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                    : '-'}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-primary">Complétion du profil</h3>
            {(() => {
              const fields = [
                profile?.nom,
                profile?.prenom || profile?.prenoms,
                profile?.pays_residence,
                profile?.pays_nationalite,
                profile?.langue_preferee,
                profile?.type_apprenant === 'PROFESSIONNEL' ? profile?.secteur_activite : profile?.niveau_etude,
              ];
              const filled = fields.filter(Boolean).length;
              const pct = Math.round((filled / fields.length) * 100);
              return (
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-subtext">{filled}/{fields.length} champs renseignés</span>
                    <span className="font-semibold text-primary">{pct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className="h-2 rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {pct < 100 && (
                    <p className="mt-2 text-xs text-subtext">
                      Complétez votre profil pour améliorer vos recommandations.
                    </p>
                  )}
                </div>
              );
            })()}
          </Card>
        </div>
      </div>
    </div>
  );
}
