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
const MODE_LABEL = {
  PRESENTIEL: 'Présentiel',
  EN_LIGNE: 'En ligne',
  A_LA_DEMANDE: 'À la demande',
};

export default function FormationDetailView({ formation, showStatut = false, actions = null }) {
  const tarif = formation.tarif ?? formation.cout_catalogue ?? 0;
  const duree = formation.duree || formation.duree_jours;
  const mode = MODE_LABEL[formation.mode_formation] || formation.mode_formation || '-';

  return (
    <div className="space-y-5">

      {/* Header — image + titre + description courte + actions */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        {formation.image_url && (
          <img
            src={formation.image_url}
            alt={formation.titre || formation.intitule}
            className="h-52 w-full object-cover"
          />
        )}
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
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
          {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </div>
      </div>

      {/* Chiffres clés — ligne compacte */}
      <div className="rounded-lg bg-white px-6 py-4 shadow">
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {duree && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-subtext">Durée</p>
              <p className="mt-0.5 text-sm font-semibold text-text">{duree} jours</p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-subtext">Mode</p>
            <p className="mt-0.5 text-sm font-semibold text-text">{mode}</p>
          </div>
          {formation.lieu && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-subtext">Lieu</p>
              <p className="mt-0.5 text-sm font-semibold text-text">{formation.lieu}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-subtext">Tarif</p>
            <p className="mt-0.5 text-lg font-bold text-primary">{Math.round(tarif / 100).toLocaleString('fr-FR')} FCFA</p>
          </div>
          {showStatut && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-subtext">Statut</p>
              <div className="mt-0.5">{getStatutBadge(formation.statut)}</div>
            </div>
          )}
          {showStatut && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-subtext">Sessions</p>
              <p className="mt-0.5 text-sm text-text">{formation._count?.sessions || 0}</p>
            </div>
          )}
        </div>
        {formation.certification_delivree && (
          <div className="mt-3 pt-3 border-t border-border">
            <span className="inline-block rounded-md bg-[#148F77]/10 px-3 py-1 text-sm font-medium text-[#148F77]">
              Certification délivrée à l'issue de la formation
            </span>
          </div>
        )}
      </div>

      {/* Objectifs pédagogiques */}
      {formation.objectifs_pedagogiques?.length > 0 && (
        <Card title="Ce que vous allez apprendre">
          <ul className="space-y-2">
            {formation.objectifs_pedagogiques.map((obj, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-text">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                {obj}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Public cible — affiché si présent */}
      {formation.public_cible && (
        <Card title="À qui s'adresse cette formation ?">
          <p className="text-sm text-text leading-relaxed">{formation.public_cible}</p>
        </Card>
      )}

      {/* Sections supplémentaires backoffice uniquement */}
      {showStatut && formation.prerequis && (
        <Card title="Prérequis">
          <p className="text-sm text-text">{formation.prerequis}</p>
        </Card>
      )}

      {showStatut && formation.description_longue && (
        <Card title="Description détaillée">
          <div className="space-y-3 text-sm text-subtext leading-relaxed">
            {formation.description_longue
              .split(/\n{2,}/)
              .map((para) => para.trim())
              .filter(Boolean)
              .map((para, idx) => <p key={idx}>{para}</p>)}
          </div>
        </Card>
      )}

    </div>
  );
}
