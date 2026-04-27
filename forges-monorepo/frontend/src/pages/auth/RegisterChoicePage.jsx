import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import FeatureIcon from '../../components/ui/FeatureIcon';

/**
 * RegisterChoicePage - Page de choix du type d'inscription
 * Permet de choisir entre inscription apprenant ou organisation
 * Référence: CLAUDE.md section 17 - Étape F-5
 */
export default function RegisterChoicePage() {
  return (
    <div className="min-h-screen bg-bg py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-primary mb-4">
              Créer un compte FORGES
            </h1>
            <p className="text-lg text-subtext">
              Choisissez le type de compte qui correspond à votre profil
            </p>
          </div>

          {/* Choice Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Apprenant */}
            <Card className="hover:shadow-lg transition-shadow">
              <div className="text-center">
                {/* Icon */}
                <div className="mb-6 flex justify-center">
                  <FeatureIcon type="student" color="secondary" size="large" />
                </div>

                {/* Content */}
                <h2 className="text-2xl font-bold text-primary mb-3">
                  Apprenant
                </h2>
                <p className="text-subtext mb-6">
                  Vous êtes un particulier souhaitant vous inscrire à nos
                  formations pour développer vos compétences professionnelles ou
                  académiques.
                </p>

                {/* Features */}
                <div className="text-left mb-6 space-y-2">
                  <div className="flex items-start gap-2">
                    <FeatureIcon type="check" color="success" size="small" className="mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-text">
                      Accès au catalogue complet
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <FeatureIcon type="check" color="success" size="small" className="mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-text">
                      Suivi de vos dossiers d'inscription
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <FeatureIcon type="check" color="success" size="small" className="mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-text">
                      Téléchargement d'attestations
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <FeatureIcon type="check" color="success" size="small" className="mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-text">
                      Utilisation de codes promo
                    </span>
                  </div>
                </div>

                {/* CTA */}
                <Link to="/register/etudiant">
                  <Button variant="primary" size="large" fullWidth>
                    S'inscrire en tant qu'apprenant
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Organisation */}
            <Card className="hover:shadow-lg transition-shadow">
              <div className="text-center">
                {/* Icon */}
                <div className="mb-6 flex justify-center">
                  <FeatureIcon type="building" color="primary" size="large" />
                </div>

                {/* Content */}
                <h2 className="text-2xl font-bold text-primary mb-3">
                  Organisation
                </h2>
                <p className="text-subtext mb-6">
                  Vous représentez une entreprise, une association ou un
                  organisme gouvernemental souhaitant former vos employés ou
                  membres.
                </p>

                {/* Features */}
                <div className="text-left mb-6 space-y-2">
                  <div className="flex items-start gap-2">
                    <FeatureIcon type="check" color="success" size="small" className="mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-text">
                      Gestion de vos employés/membres
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <FeatureIcon type="check" color="success" size="small" className="mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-text">
                      Création de vouchers d'inscription
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <FeatureIcon type="check" color="success" size="small" className="mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-text">
                      Suivi consolidé des inscriptions
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <FeatureIcon type="check" color="success" size="small" className="mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-text">
                      Tableaux de bord et rapports
                    </span>
                  </div>
                </div>

                {/* CTA */}
                <Link to="/register/organisation">
                  <Button variant="primary" size="large" fullWidth>
                    S'inscrire en tant qu'organisation
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-subtext">
              Vous avez déjà un compte ?{' '}
              <Link
                to="/login"
                className="text-secondary hover:text-primary font-medium"
              >
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
