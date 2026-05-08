import Badge from '../ui/Badge';
import Card from '../ui/Card';

function getStatutBadge(statut) {
  const mapping = {
    BROUILLON: { variant: 'gray', label: 'Brouillon' },
    EN_ATTENTE_PLANIFICATION: { variant: 'warning', label: 'En attente planification' },
    EN_ATTENTE_VALIDATION: { variant: 'warning', label: 'En attente validation' },
    ACTIVE: { variant: 'success', label: 'Active' },
    ARCHIVEE: { variant: 'danger', label: 'Archivée' },
    REJETEE: { variant: 'danger', label: 'Rejetée' },
    SUSPENDUE: { variant: 'warning', label: 'Suspendue' },
  };
  const config = mapping[statut] || { variant: 'gray', label: statut };
  return <Badge variant={config.variant} size="small">{config.label}</Badge>;
}

/**
 * Composant partagé de détail formation.
 * Utilisé par FormationDetail (backoffice) et FormationDetailApprenantPage (apprenant).
 *
 * Props:
 *   formation   — objet formation normalisé
 *   showStatut  — afficher le badge statut (backoffice uniquement)
 *   actions     — nœud React affiché en haut à droite (boutons spécifiques au contexte)
 */
export default function FormationDetailView({ formation, showStatut = false, actions = null }) {
  const tarif = formation.tarif ?? formation.cout_catalogue ?? 0;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-primary">
              {formation.titre || formation.intitule}
            </h1>
            {(formation.description_courte || formation.description) && (
              <p className="mt-2 text-sm text-subtext leading-relaxed">
                {formation.description_courte || formation.description}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-3">
            {formation.image_url && (
              <img
                src={formation.image_url}
                alt={formation.titre || formation.intitule}
                className="h-32 w-48 rounded-lg object-cover shadow"
              />
            )}
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>
        </div>
      </div>

      {/* Résumé */}
      <Card title="Résumé">
        <div className="grid gap-4 md:grid-cols-3">
          {showStatut && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-subtext">Statut</p>
              <div className="mt-1">{getStatutBadge(formation.statut)}</div>
            </div>
          )}
          {showStatut && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-subtext">Sessions</p>
              <p className="mt-1 text-sm text-text">{formation._count?.sessions || 0}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-subtext">Durée</p>
            <p className="mt-1 text-sm font-semibold text-text">
              {formation.duree || formation.duree_jours} jours
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-subtext">Mode</p>
            <p className="mt-1 text-sm font-semibold text-text">
              {formation.mode_formation === 'PRESENTIEL' ? 'Présentiel'
                : formation.mode_formation === 'EN_LIGNE' ? 'En ligne'
                : formation.mode_formation === 'A_LA_DEMANDE' ? 'À la demande'
                : formation.mode_formation || '-'}
            </p>
          </div>
          {formation.lieu && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-subtext">Lieu</p>
              <p className="mt-1 text-sm font-semibold text-text">{formation.lieu}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-subtext">Tarif</p>
            <p className="mt-1 text-lg font-bold text-primary">
              {tarif.toLocaleString('fr-FR')} FCFA
            </p>
          </div>
          {formation.certification_delivree && (
            <div className="md:col-span-3">
              <span className="inline-block rounded-md bg-[#148F77]/10 px-3 py-1 text-sm font-medium text-[#148F77]">
                Certification délivrée à l'issue de la formation
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Informations clés */}
      {(formation.objectifs_pedagogiques?.length > 0 || formation.public_cible || formation.prerequis) && (
        <Card title="Informations clés">
          <div className="grid gap-6 md:grid-cols-2">
            {formation.objectifs_pedagogiques?.length > 0 && (
              <div className="md:col-span-2">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtext">Objectifs pédagogiques</p>
                <ul className="space-y-1">
                  {formation.objectifs_pedagogiques.map((obj, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-text">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                      {obj}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {formation.public_cible && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-subtext">Public cible</p>
                <p className="text-sm text-text">{formation.public_cible}</p>
              </div>
            )}
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-subtext">Prérequis</p>
              {formation.prerequis
                ? <p className="text-sm text-text">{formation.prerequis}</p>
                : <p className="text-sm text-subtext italic">Aucun prérequis</p>
              }
            </div>
          </div>
        </Card>
      )}

      {/* Description longue */}
      {(formation.description_courte || formation.description || formation.description_longue) && (
        <Card title="Description">
          <div className="space-y-3 text-sm text-text">
            {formation.description_longue && (
              <div className="space-y-3">
                {formation.description_longue
                  .split(/\n{2,}|(?=Semaine \d)/)
                  .map((para) => para.trim())
                  .filter(Boolean)
                  .map((para, idx) => {
                    const isSectionHeader = /^Semaine \d/.test(para);
                    return isSectionHeader ? (
                      <div key={idx} className="rounded-lg bg-[#F4F6F7] px-4 py-3">
                        <p className="font-semibold text-primary">{para.split('—')[0].trim()}</p>
                        {para.includes('—') && (
                          <p className="mt-1 text-subtext leading-relaxed">
                            {para.split('—').slice(1).join('—').trim()}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p key={idx} className="leading-relaxed text-subtext">{para}</p>
                    );
                  })}
              </div>
            )}
          </div>
        </Card>
      )}

    </div>
  );
}
