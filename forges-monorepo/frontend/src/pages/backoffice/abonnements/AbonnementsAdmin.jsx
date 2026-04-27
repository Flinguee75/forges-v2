import Card from '../../../components/ui/Card';
import EmptyState from '../../../components/feedback/EmptyState';

export default function AbonnementsAdmin() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
          Backoffice abonnements
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-primary">
          Vue consolidée des abonnements
        </h1>
        <p className="mt-2 text-sm text-subtext">
          La structure d&apos;analyse reste visible, mais les données ne sont plus chargées tant que les routes runtime manquent.
        </p>
      </div>
      <Card>
        <EmptyState
          title="Abonnements figés"
          message="Les vues Retail, B2B et Organisation seront réactivées quand le backend sera prêt."
        />
      </Card>
    </div>
  );
}
