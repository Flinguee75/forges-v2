import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { organisationApi } from '../../api/espace-organisation.api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/feedback/Spinner';
import Badge from '../../components/ui/Badge';

/**
 * ProfilOrganisationPage - Profil de l'organisation
 * Route: /organisation/profil
 * Référence: MOD-10 Espace Organisation (CLAUDE.md)
 */
export default function ProfilOrganisationPage() {
  const [profil, setProfil] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nom_legal: '',
    email_contact: '',
    contact_referent: '',
    pays: '',
    langue_preferee: 'FR',
  });

  const { execute, isLoading, error } = useApi();
  const { showToast } = useToast();

  const loadProfil = async () => {
    await execute(
      () => organisationApi.getProfil(),
      {
        onSuccess: (data) => {
          setProfil(data);
          setFormData({
            nom_legal: data.nom_legal || '',
            email_contact: data.email_contact || '',
            contact_referent: data.contact_referent || '',
            pays: data.pays || '',
            langue_preferee: data.langue_preferee || 'FR',
          });
        },
      }
    );
  };

  useEffect(() => {
    loadProfil();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    await execute(
      () => organisationApi.updateProfil(formData),
      {
        onSuccess: (data) => {
          showToast('Profil mis à jour avec succès', 'success');
          setIsEditing(false);
          // Mettre à jour profil et formData directement depuis la réponse PUT normalisée
          // Le normaliseur garantit que nom_legal = raison_sociale
          if (data) {
            setProfil(data);
            setFormData({
              nom_legal: data.nom_legal || data.raison_sociale || '',
              email_contact: data.email_contact || data.email || '',
              contact_referent: data.contact_referent || '',
              pays: data.pays || '',
              langue_preferee: data.langue_preferee || 'FR',
            });
          }
          // Ne pas re-fetch ici, on utilise la réponse PUT directement
        },
      }
    );
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      nom_legal: profil?.nom_legal || '',
      email_contact: profil?.email_contact || '',
      contact_referent: profil?.contact_referent || '',
      pays: profil?.pays || '',
      langue_preferee: profil?.langue_preferee || 'FR',
    });
  };

  const getStatutBadge = (statut) => {
    const mapping = {
      ACTIVE: { variant: 'success', label: 'Active' },
      EN_ATTENTE: { variant: 'warning', label: 'En attente' },
      SUSPENDUE: { variant: 'danger', label: 'Suspendue' },
    };
    const config = mapping[statut] || { variant: 'gray', label: statut };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeLabel = (type) => {
    const mapping = {
      ENTREPRISE: 'Entreprise',
      ASSOCIATION: 'Association',
      GOUVERNEMENT: 'Gouvernement',
    };
    return mapping[type] || type;
  };

  if (isLoading && !profil) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (!profil) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-lg border border-danger bg-danger/5 p-6">
          <p className="font-semibold text-danger">Impossible de charger le profil</p>
          <p className="mt-1 text-sm text-subtext">
            {error || 'Une erreur est survenue. Veuillez recharger la page.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
              Profil organisation
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-primary">
              Informations de votre organisation
            </h2>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)}>Modifier</Button>
          )}
        </div>
      </div>

      <Card>
        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Nom légal"
                value={formData.nom_legal}
                onChange={(e) =>
                  setFormData({ ...formData, nom_legal: e.target.value })
                }
                required
              />
              <Input
                label="Email de contact"
                type="email"
                value={formData.email_contact}
                onChange={(e) =>
                  setFormData({ ...formData, email_contact: e.target.value })
                }
                required
              />
            </div>

            <Input
              label="Contact référent"
              value={formData.contact_referent}
              onChange={(e) =>
                setFormData({ ...formData, contact_referent: e.target.value })
              }
              required
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Pays"
                value={formData.pays}
                onChange={(e) =>
                  setFormData({ ...formData, pays: e.target.value })
                }
                required
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text">
                  Langue préférée
                </label>
                <select
                  value={formData.langue_preferee}
                  onChange={(e) =>
                    setFormData({ ...formData, langue_preferee: e.target.value })
                  }
                  className="w-full rounded-lg border border-border px-4 py-2"
                >
                  <option value="FR">Français</option>
                  <option value="EN">Anglais</option>
                  <option value="ES">Espagnol</option>
                  <option value="PT">Portugais</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
              >
                Annuler
              </Button>
              <Button type="submit" loading={isLoading}>
                Enregistrer
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="mb-4 text-lg font-semibold text-primary">
                Informations générales
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-subtext">Email</p>
                  <p className="font-medium text-text">{profil.email}</p>
                </div>
                <div>
                  <p className="text-sm text-subtext">Type</p>
                  <p className="font-medium text-text">
                    {getTypeLabel(profil.type)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-subtext">Nom légal</p>
                  <p className="font-medium text-text">{profil.nom_legal}</p>
                </div>
                <div>
                  <p className="text-sm text-subtext">Nom commercial</p>
                  <p className="font-medium text-text">
                    {profil.nom_commercial || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-subtext">RCCM / Identifiant légal</p>
                  <p className="font-medium text-text">
                    {profil.identifiant_legal || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-subtext">Secteur d'activité</p>
                  <p className="font-medium text-text">
                    {profil.secteur_activite || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-subtext">Pays</p>
                  <p className="font-medium text-text">{profil.pays}</p>
                </div>
                <div>
                  <p className="text-sm text-subtext">Statut</p>
                  <div className="mt-1">{getStatutBadge(profil.statut)}</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-lg font-semibold text-primary">
                Contact
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-subtext">Email de contact</p>
                  <p className="font-medium text-text">{profil.email_contact}</p>
                </div>
                <div>
                  <p className="text-sm text-subtext">Téléphone de contact</p>
                  <p className="font-medium text-text">
                    {profil.telephone_contact || '-'}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-lg font-semibold text-primary">
                Référent
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-subtext">Référent</p>
                  <p className="font-medium text-text">{profil.contact_referent || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
