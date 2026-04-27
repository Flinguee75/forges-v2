import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { etudiantApi } from '../../api/espace-etudiant.api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/feedback/Spinner';

/**
 * MonProfilPage - Gestion du profil apprenant
 * Route: /apprenant/profil
 * Référence: MOD-02 Comptes
 */
export default function MonProfilPage() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    pays_residence: '',
  });

  const { execute, isLoading } = useApi();
  const { showToast } = useToast();

  const normalizeProfilePayload = (payload = {}) => {
    const source = payload?.apprenant || payload?.data?.apprenant || payload?.data || payload;

    return {
      ...source,
      prenom: source?.prenom || source?.prenoms || '',
      prenoms: source?.prenoms || source?.prenom || '',
      pays_residence: source?.pays_residence || source?.pays_iso || '',
    };
  };

  const normalizeProfileToFormData = (data = {}) => ({
    nom: data.nom || '',
    prenom: data.prenom || data.prenoms || '',
    pays_residence: data.pays_residence || data.pays_iso || '',
  });

  const handleFieldChange = (field) => (eventOrValue) => {
    const value =
      eventOrValue && typeof eventOrValue === 'object' && 'target' in eventOrValue
        ? eventOrValue.target.value
        : eventOrValue;

    setFormData((current) => ({
      ...current,
      [field]: value ?? '',
    }));
  };

  const loadProfile = async () => {
    await execute(() => etudiantApi.getProfil(), {
      onSuccess: (data) => {
        const normalizedProfile = normalizeProfilePayload(data);
        setProfile(normalizedProfile);
        setFormData(normalizeProfileToFormData(normalizedProfile));
      },
    });
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    await execute(() => etudiantApi.updateProfil(formData), {
      onSuccess: (data) => {
        const normalizedProfile = normalizeProfilePayload(data);
        setProfile(normalizedProfile);
        setFormData(normalizeProfileToFormData(normalizedProfile));
        updateUser({ ...user, ...normalizedProfile });
        setIsEditing(false);
        showToast('Profil mis à jour avec succès', 'success');
      },
      onError: (error) => {
        showToast(error.message || 'Erreur lors de la mise à jour du profil', 'error');
      },
    });
  };

  const getTypeApprenantLabel = (type) => {
    return type === 'PROFESSIONNEL' ? 'Professionnel' : 'Apprenant';
  };

  if (!profile && isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-primary">Mon Profil</h1>
        <p className="mt-2 text-subtext">
          Gérez vos informations personnelles et vos préférences
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-primary">
                Informations personnelles
              </h2>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => setIsEditing(true)}
                >
                  Modifier
                </Button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Nom"
                    value={formData.nom}
                    onChange={handleFieldChange('nom')}
                    required
                  />
                  <Input
                    label="Prénom"
                    value={formData.prenom}
                    onChange={handleFieldChange('prenom')}
                    required
                  />
                </div>

                <Input
                  label="Pays de résidence"
                  value={formData.pays_residence}
                  onChange={handleFieldChange('pays_residence')}
                  placeholder="Ex: CI, FR, SN..."
                  maxLength={2}
                />

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData(normalizeProfileToFormData(profile));
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
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-subtext">Email</label>
                  <p className="font-medium text-text">{profile?.email || '-'}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-sm text-subtext">Nom</label>
                    <p className="font-medium text-text">{profile?.nom || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-subtext">Prénom</label>
                    <p className="font-medium text-text">
                      {profile?.prenom || profile?.prenoms || '-'}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-subtext">Pays de résidence</label>
                  <p className="font-medium text-text">
                    {profile?.pays_residence || '-'}
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-primary">
              Informations de compte
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-subtext">Statut</label>
                <div className="mt-1">
                  <Badge variant="success">
                    {profile?.statut === 'ACTIF' ? 'Actif' : profile?.statut}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-subtext">Type d'apprenant</label>
                <p className="font-medium text-text">
                  {profile?.type_apprenant
                    ? getTypeApprenantLabel(profile.type_apprenant)
                    : '-'}
                </p>
              </div>
              {profile?.type_apprenant === 'PROFESSIONNEL' && (
                <div>
                  <label className="text-subtext">Secteur d'activité</label>
                  <p className="font-medium text-text">
                    {profile?.secteur_activite || '-'}
                  </p>
                </div>
              )}
              {profile?.type_apprenant === 'APPRENANT' && (
                <div>
                  <label className="text-subtext">Niveau d'étude</label>
                  <p className="font-medium text-text">
                    {profile?.niveau_etude || '-'}
                  </p>
                </div>
              )}
              <div>
                <label className="text-subtext">Membre depuis</label>
                <p className="font-medium text-text">
                  {profile?.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString('fr-FR')
                    : '-'}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-primary">Sécurité</h3>
            <Button variant="outline" size="small" className="w-full">
              Changer le mot de passe
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
