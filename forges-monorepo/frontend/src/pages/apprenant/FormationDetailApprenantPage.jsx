import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formationsApi } from '../../api/formations.api';
import { useApi } from '../../hooks/useApi';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/feedback/Spinner';
import EmptyState from '../../components/feedback/EmptyState';

export default function FormationDetailApprenantPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { execute, isLoading, error } = useApi();
  const [formation, setFormation] = useState(null);

  useEffect(() => {
    execute(() => formationsApi.getFormationDetail(id), {
      onSuccess: (response) => setFormation(response?.data || response),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (isLoading && !formation) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (error && !formation) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card>
          <EmptyState
            title="Formation indisponible"
            message={error}
            action={
              <Button onClick={() => navigate('/apprenant/catalogue')}>
                Retour au catalogue
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  if (!formation) return null;

  const isALaDemande = formation.mode_formation === 'A_LA_DEMANDE';
  const tarif = formation.tarif ?? formation.cout_catalogue ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      {/* Header */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <button
              type="button"
              onClick={() => navigate('/apprenant/catalogue')}
              className="mb-3 text-sm text-primary hover:underline"
            >
              &larr; Retour au catalogue
            </button>
            <h1 className="text-2xl font-semibold text-primary">
              {formation.titre || formation.intitule}
            </h1>
            {(formation.description_courte || formation.description) && (
              <p className="mt-2 text-sm text-subtext leading-relaxed">
                {formation.description_courte || formation.description}
              </p>
            )}
          </div>
          {formation.image_url && (
            <img
              src={formation.image_url}
              alt={formation.titre || formation.intitule}
              className="h-36 w-56 flex-shrink-0 rounded-lg object-cover shadow"
            />
          )}
        </div>
      </div>

      {/* Résumé */}
      <Card title="Résumé">
        <div className="grid gap-4 md:grid-cols-3">
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
            <div className="md:col-span-2 flex items-center">
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
      {formation.description_longue && (
        <Card title="Description détaillée">
          <div className="space-y-3 text-sm text-text">
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
        </Card>
      )}

      {/* CTA */}
      <div className="flex justify-end gap-3 pb-6">
        <Button variant="outline" onClick={() => navigate('/apprenant/catalogue')}>
          Retour au catalogue
        </Button>
        <Button
          onClick={() => {
            if (isALaDemande) navigate(`/apprenant/inscrire/${id}`);
            else navigate(`/apprenant/inscrire/${id}`);
          }}
        >
          {isALaDemande ? 'Accéder maintenant' : "S'inscrire à une session"}
        </Button>
      </div>

    </div>
  );
}
