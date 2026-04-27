import { Link } from 'react-router-dom';
import { useState } from 'react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import FeatureIcon from '../../components/ui/FeatureIcon';

/**
 * LandingPage - Page d'accueil publique haute conversion
 * Référence: CLAUDE.md section 17 - Étape F-5
 * Optimisée pour conversions et SEO
 */
export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Hero Section - High Converting */}
      <section className="bg-gradient-to-br from-primary via-secondary to-primary text-white py-24 md:py-32 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge Made in Africa */}
            <div className="inline-flex items-center gap-2 bg-white bg-opacity-20 backdrop-blur-sm px-4 py-2 rounded-full mb-8">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Plateforme africaine de formation professionnelle</span>
            </div>

            {/* Compelling Headline */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 tracking-tight leading-tight">
              Votre Passerelle vers<br />l'Excellence Professionnelle
            </h1>

            {/* Powerful Subheadline */}
            <p className="text-xl md:text-2xl mb-4 font-light max-w-3xl mx-auto leading-relaxed">
              FORGES simplifie l'accès à la formation de qualité en Afrique
            </p>

            {/* Value Proposition */}
            <p className="text-base md:text-lg mb-10 opacity-95 max-w-2xl mx-auto leading-relaxed">
              Inscription en ligne, paiements sécurisés, suivi en temps réel et attestations officielles.
              Tout ce dont vous avez besoin pour gérer vos formations du début à la fin.
            </p>

            {/* Strong CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link to="/register">
                <Button variant="white" size="large" className="min-w-[240px] font-semibold">
                  Créer un compte gratuit
                </Button>
              </Link>
              <Link to="/catalogue">
                <Button variant="white" size="large" className="min-w-[240px] font-semibold bg-transparent border-2 border-white hover:bg-white hover:bg-opacity-10">
                  Explorer le catalogue
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto pt-10 border-t border-white border-opacity-20">
              <div className="flex flex-col items-center">
                <div className="text-4xl md:text-5xl font-bold mb-2">100%</div>
                <div className="text-sm md:text-base opacity-90">Digital & Mobile</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-4xl md:text-5xl font-bold mb-2">Sécurisé</div>
                <div className="text-sm md:text-base opacity-90">Paiements Mobile Money</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-4xl md:text-5xl font-bold mb-2">Rapide</div>
                <div className="text-sm md:text-base opacity-90">Inscription en 2 minutes</div>
              </div>
            </div>

            {/* Social Proof Teaser */}
            <div className="mt-12 text-sm opacity-80">
              Rejoignez les professionnels et organisations qui développent leurs compétences avec FORGES
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Simple 3 Steps */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-primary mb-6">
              Comment ça marche ?
            </h2>
            <p className="text-lg md:text-xl text-subtext leading-relaxed">
              Trois étapes simples pour commencer votre parcours de formation
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 max-w-6xl mx-auto">
            <div className="text-center relative">
              <div className="mb-6 flex justify-center">
                <div className="relative">
                  <FeatureIcon type="student" color="secondary" size="large" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-secondary text-white rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-primary mb-3">
                Créez votre compte
              </h3>
              <p className="text-subtext leading-relaxed">
                Inscription gratuite en 2 minutes. Choisissez votre profil : Apprenant ou Organisation.
                Aucune carte bancaire requise.
              </p>
            </div>

            <div className="text-center relative">
              <div className="mb-6 flex justify-center">
                <div className="relative">
                  <FeatureIcon type="book" color="success" size="large" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-success text-white rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-primary mb-3">
                Choisissez votre formation
              </h3>
              <p className="text-subtext leading-relaxed">
                Explorez notre catalogue de formations professionnelles. Filtrez par domaine, durée et prix.
                Inscrivez-vous en un clic.
              </p>
            </div>

            <div className="text-center relative">
              <div className="mb-6 flex justify-center">
                <div className="relative">
                  <FeatureIcon type="check" color="primary" size="large" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-primary mb-3">
                Suivez votre progression
              </h3>
              <p className="text-subtext leading-relaxed">
                Tableau de bord intuitif pour suivre vos dossiers, paiements et télécharger vos attestations officielles.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features - Benefits Oriented */}
      <section className="py-20 bg-bg">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-primary mb-6">
              Pourquoi choisir FORGES ?
            </h2>
            <p className="text-lg md:text-xl text-subtext leading-relaxed">
              Une plateforme conçue pour répondre aux défis spécifiques de la formation en Afrique
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
            <Card className="text-center hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-secondary">
              <div className="mb-6 flex justify-center">
                <FeatureIcon type="book" color="secondary" size="medium" />
              </div>
              <h3 className="text-xl font-semibold text-primary mb-3">
                Catalogue Adapté au Marché Local
              </h3>
              <p className="text-subtext leading-relaxed">
                Des formations <strong>pertinentes</strong> pour le marché africain : comptabilité OHADA,
                agriculture durable, technologies adaptées, et bien plus.
              </p>
            </Card>

            <Card className="text-center hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-success">
              <div className="mb-6 flex justify-center">
                <FeatureIcon type="check" color="success" size="medium" />
              </div>
              <h3 className="text-xl font-semibold text-primary mb-3">
                Zéro Papier, 100% Digital
              </h3>
              <p className="text-subtext leading-relaxed">
                Fini les files d'attente et la paperasse. Tout se passe en ligne :
                inscription, paiement, suivi et <strong>attestations PDF sécurisées</strong>.
              </p>
            </Card>

            <Card className="text-center hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary">
              <div className="mb-6 flex justify-center">
                <FeatureIcon type="users" color="primary" size="medium" />
              </div>
              <h3 className="text-xl font-semibold text-primary mb-3">
                Solutions Entreprise & Organisations
              </h3>
              <p className="text-subtext leading-relaxed">
                Formez vos équipes à grande échelle avec des <strong>vouchers prépayés</strong>,
                un tableau de bord RH et des rapports consolidés.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section - Detailed */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
              Avantages pour tous les profils
            </h2>
            <p className="text-lg text-subtext max-w-2xl mx-auto">
              FORGES répond aux besoins spécifiques du marché africain
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <div className="flex gap-4 items-start bg-bg p-6 rounded-lg border border-gray-200 hover:border-secondary transition-colors">
              <div className="flex-shrink-0 mt-1">
                <FeatureIcon type="check" color="success" size="small" />
              </div>
              <div>
                <h4 className="font-semibold text-primary mb-2">Paiements locaux acceptés</h4>
                <p className="text-sm text-subtext">Mobile Money, Orange Money, Wave, cartes bancaires et virements : tous les modes de paiement africains sont pris en charge</p>
              </div>
            </div>

            <div className="flex gap-4 items-start bg-bg p-6 rounded-lg border border-gray-200 hover:border-secondary transition-colors">
              <div className="flex-shrink-0 mt-1">
                <FeatureIcon type="check" color="success" size="small" />
              </div>
              <div>
                <h4 className="font-semibold text-primary mb-2">Attestations officielles en PDF</h4>
                <p className="text-sm text-subtext">Téléchargez vos attestations certifiées immédiatement après validation de votre formation, sans déplacement</p>
              </div>
            </div>

            <div className="flex gap-4 items-start bg-bg p-6 rounded-lg border border-gray-200 hover:border-secondary transition-colors">
              <div className="flex-shrink-0 mt-1">
                <FeatureIcon type="check" color="success" size="small" />
              </div>
              <div>
                <h4 className="font-semibold text-primary mb-2">Sécurité certifiée</h4>
                <p className="text-sm text-subtext">Vos données personnelles et paiements protégés par chiffrement AES-256 et conformes aux standards internationaux</p>
              </div>
            </div>

            <div className="flex gap-4 items-start bg-bg p-6 rounded-lg border border-gray-200 hover:border-secondary transition-colors">
              <div className="flex-shrink-0 mt-1">
                <FeatureIcon type="check" color="success" size="small" />
              </div>
              <div>
                <h4 className="font-semibold text-primary mb-2">Accessible 24/7 partout</h4>
                <p className="text-sm text-subtext">Plateforme responsive accessible depuis mobile, tablette ou ordinateur, même avec une connexion faible</p>
              </div>
            </div>

            <div className="flex gap-4 items-start bg-bg p-6 rounded-lg border border-gray-200 hover:border-secondary transition-colors">
              <div className="flex-shrink-0 mt-1">
                <FeatureIcon type="check" color="success" size="small" />
              </div>
              <div>
                <h4 className="font-semibold text-primary mb-2">Support client réactif</h4>
                <p className="text-sm text-subtext">Équipe support disponible par email et téléphone pour vous accompagner à chaque étape de votre parcours</p>
              </div>
            </div>

            <div className="flex gap-4 items-start bg-bg p-6 rounded-lg border border-gray-200 hover:border-secondary transition-colors">
              <div className="flex-shrink-0 mt-1">
                <FeatureIcon type="check" color="success" size="small" />
              </div>
              <div>
                <h4 className="font-semibold text-primary mb-2">Vouchers pour organisations</h4>
                <p className="text-sm text-subtext">Système de vouchers prépayés pour former vos employés ou membres en masse avec tableau de bord consolidé</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-bg">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
                Questions fréquentes
              </h2>
              <p className="text-lg text-subtext">
                Tout ce que vous devez savoir sur FORGES
              </p>
            </div>

            <div className="space-y-4">
              {/* FAQ 1 */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleFaq(0)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-primary">
                    Comment créer un compte sur FORGES ?
                  </span>
                  <svg
                    className={`w-5 h-5 text-secondary transition-transform ${openFaq === 0 ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === 0 && (
                  <div className="px-6 pb-4 text-subtext">
                    L'inscription est gratuite et prend moins de 2 minutes. Cliquez sur "Créer un compte",
                    choisissez votre profil (Apprenant ou Organisation), remplissez vos informations et confirmez
                    votre email. Aucune carte bancaire n'est requise pour créer un compte.
                  </div>
                )}
              </div>

              {/* FAQ 2 */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleFaq(1)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-primary">
                    Quels modes de paiement sont acceptés ?
                  </span>
                  <svg
                    className={`w-5 h-5 text-secondary transition-transform ${openFaq === 1 ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === 1 && (
                  <div className="px-6 pb-4 text-subtext">
                    FORGES accepte tous les modes de paiement populaires en Afrique : Mobile Money
                    (Orange Money, MTN Mobile Money, Wave), cartes bancaires Visa/Mastercard,
                    virements bancaires, et vouchers prépayés pour les organisations.
                  </div>
                )}
              </div>

              {/* FAQ 3 */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleFaq(2)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-primary">
                    Combien de temps faut-il pour valider mon inscription ?
                  </span>
                  <svg
                    className={`w-5 h-5 text-secondary transition-transform ${openFaq === 2 ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === 2 && (
                  <div className="px-6 pb-4 text-subtext">
                    Une fois votre dossier d'inscription soumis, il est examiné par l'équipe de la formation
                    dans un délai de 24 à 72 heures. Vous recevez une notification par email dès que votre
                    dossier est validé. Le paiement doit être effectué dans les 72 heures suivant la validation.
                  </div>
                )}
              </div>

              {/* FAQ 4 */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleFaq(3)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-primary">
                    Comment obtenir mon attestation de formation ?
                  </span>
                  <svg
                    className={`w-5 h-5 text-secondary transition-transform ${openFaq === 3 ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === 3 && (
                  <div className="px-6 pb-4 text-subtext">
                    Votre attestation officielle en PDF est disponible immédiatement dans votre espace personnel
                    une fois votre formation terminée et votre paiement confirmé. Vous pouvez la télécharger
                    autant de fois que nécessaire, sans frais supplémentaires.
                  </div>
                )}
              </div>

              {/* FAQ 5 */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleFaq(4)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-primary">
                    Les organisations peuvent-elles former plusieurs employés ?
                  </span>
                  <svg
                    className={`w-5 h-5 text-secondary transition-transform ${openFaq === 4 ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === 4 && (
                  <div className="px-6 pb-4 text-subtext">
                    Oui, les comptes Organisation ont accès à un système de vouchers prépayés qui permet
                    d'inscrire plusieurs employés ou membres à des formations. Vous bénéficiez d'un tableau
                    de bord consolidé pour suivre toutes les inscriptions, un système de gestion des bénéficiaires,
                    et des rapports détaillés.
                  </div>
                )}
              </div>

              {/* FAQ 6 */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleFaq(5)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-primary">
                    Mes données sont-elles sécurisées ?
                  </span>
                  <svg
                    className={`w-5 h-5 text-secondary transition-transform ${openFaq === 5 ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === 5 && (
                  <div className="px-6 pb-4 text-subtext">
                    Absolument. FORGES utilise un chiffrement AES-256 pour protéger vos données personnelles,
                    HTTPS obligatoire pour toutes les communications, et respecte les standards internationaux
                    de sécurité. Vos informations de paiement ne sont jamais stockées sur nos serveurs et transitent
                    par des passerelles de paiement certifiées.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
              Choisissez votre profil
            </h2>
            <p className="text-lg text-subtext">
              Deux types de comptes adaptés à vos besoins
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-secondary">
              <div className="text-center p-6">
                <div className="mb-6 flex justify-center">
                  <FeatureIcon type="student" color="secondary" size="large" />
                </div>

                <h3 className="text-2xl font-bold text-primary mb-3">
                  Compte Apprenant
                </h3>
                <p className="text-subtext mb-6">
                  Pour les particuliers souhaitant développer leurs compétences professionnelles ou académiques
                </p>

                <div className="text-left mb-6 space-y-3">
                  <div className="flex items-start gap-3">
                    <FeatureIcon type="check" color="success" size="small" className="mt-1 flex-shrink-0" />
                    <span className="text-sm text-text">Accès complet au catalogue de formations</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <FeatureIcon type="check" color="success" size="small" className="mt-1 flex-shrink-0" />
                    <span className="text-sm text-text">Suivi personnalisé de vos dossiers</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <FeatureIcon type="check" color="success" size="small" className="mt-1 flex-shrink-0" />
                    <span className="text-sm text-text">Attestations PDF téléchargeables</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <FeatureIcon type="check" color="success" size="small" className="mt-1 flex-shrink-0" />
                    <span className="text-sm text-text">Codes promo et réductions</span>
                  </div>
                </div>

                <Link to="/register/etudiant">
                  <Button variant="secondary" size="large" className="w-full font-semibold">
                    Créer un compte étudiant
                  </Button>
                </Link>
              </div>
            </Card>

            <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary">
              <div className="text-center p-6">
                <div className="mb-6 flex justify-center">
                  <FeatureIcon type="building" color="primary" size="large" />
                </div>

                <h3 className="text-2xl font-bold text-primary mb-3">
                  Compte Organisation
                </h3>
                <p className="text-subtext mb-6">
                  Pour les entreprises, associations et organismes gouvernementaux qui forment leurs équipes
                </p>

                <div className="text-left mb-6 space-y-3">
                  <div className="flex items-start gap-3">
                    <FeatureIcon type="check" color="success" size="small" className="mt-1 flex-shrink-0" />
                    <span className="text-sm text-text">Gestion centralisée de vos employés</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <FeatureIcon type="check" color="success" size="small" className="mt-1 flex-shrink-0" />
                    <span className="text-sm text-text">Système de vouchers prépayés</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <FeatureIcon type="check" color="success" size="small" className="mt-1 flex-shrink-0" />
                    <span className="text-sm text-text">Tableau de bord et rapports consolidés</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <FeatureIcon type="check" color="success" size="small" className="mt-1 flex-shrink-0" />
                    <span className="text-sm text-text">Support dédié pour grandes équipes</span>
                  </div>
                </div>

                <Link to="/register/organisation">
                  <Button variant="primary" size="large" className="w-full font-semibold">
                    Créer un compte organisation
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          <div className="text-center mt-10">
            <p className="text-subtext text-lg">
              Vous avez déjà un compte ?{' '}
              <Link to="/login" className="text-secondary hover:text-primary font-semibold underline">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
