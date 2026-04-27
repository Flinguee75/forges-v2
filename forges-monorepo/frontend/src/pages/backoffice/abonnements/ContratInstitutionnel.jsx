import Card from '../../../components/ui/Card';
import EmptyState from '../../../components/feedback/EmptyState';

export default function ContratInstitutionnel() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
          UCS03.1
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-primary">
          Contrat institutionnel
        </h1>
        <p className="mt-2 text-sm text-subtext">
          Les écrans restent en place, mais la liaison API est temporairement figée.
        </p>
      </div>
      <Card>
        <EmptyState
          title="Contrats figés"
          message="La gestion institutionnelle pourra être rebranchée sans changer l&apos;UI."
        />
      </Card>
    </div>
  );
}
