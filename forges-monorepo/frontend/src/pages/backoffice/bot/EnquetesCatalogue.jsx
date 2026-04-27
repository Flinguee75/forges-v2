import Card from '../../../components/ui/Card';
import EmptyState from '../../../components/feedback/EmptyState';

export default function EnquetesCatalogue() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
          Bot admin
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-primary">
          Enquêtes formations
        </h1>
        <p className="mt-2 text-sm text-subtext">
          La vue est conservée, mais les appels de chargement et de catalogage sont figés.
        </p>
      </div>
      <Card>
        <EmptyState
          title="Enquêtes figées"
          message="Les interactions seront réactivées quand le backend exposera les routes correspondantes."
        />
      </Card>
    </div>
  );
}
