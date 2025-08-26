import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, CheckCircle, Trophy, Clock } from 'lucide-react';

const Contests = () => {
  const contests = [
    {
      title: "Engin d'Or Sénégal",
      subtitle: "Concours National BTP & Mines",
      color: "from-orange-500 to-red-500",
      categories: [
        "Conducteurs d'excavateurs",
        "Opérateurs de grues",
        "Conducteurs de bulldozers",
        "Pilotes de chargeurs",
        "Conducteurs d'engins miniers"
      ],
      criteria: [
        "Maîtrise technique de l'engin",
        "Respect des consignes de sécurité",
        "Efficacité et productivité",
        "Entretien préventif",
        "Éco-conduite"
      ]
    },
    {
      title: "Volant d'Or Sénégal",
      subtitle: "Concours National Transport Routier",
      color: "from-blue-500 to-indigo-500",
      categories: [
        "Conducteurs de transport urbain",
        "Chauffeurs de poids lourds",
        "Conducteurs de transport interurbain",
        "Pilotes de transport spécialisé",
        "Conducteurs de transport touristique"
      ],
      criteria: [
        "Conduite défensive et sécuritaire",
        "Connaissance du code de la route",
        "Relations client et service",
        "Économie de carburant",
        "Respect des horaires"
      ]
    }
  ];

  return (
    <section id="contests" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Détails des Concours
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Découvrez les objectifs, catégories et critères d'évaluation de chaque concours
          </p>
        </div>

        {/* Informations générales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl text-center">
            <Calendar className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Dates Prévues</h3>
            <p className="text-gray-600">Octobre 2025</p>
            <p className="text-sm text-blue-600 mt-2">Dates exactes à confirmer</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl text-center">
            <MapPin className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Lieux</h3>
            <p className="text-gray-600">Dakar (Finale)</p>
            <p className="text-sm text-green-600 mt-2">+ Phases régionales possibles</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl text-center">
            <Trophy className="h-12 w-12 text-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Niveau</h3>
            <p className="text-gray-600">National</p>
            <p className="text-sm text-purple-600 mt-2">Ouvert à tous les professionnels</p>
          </div>
        </div>

        {/* Détails des concours */}
        <div className="space-y-16">
          {contests.map((contest, index) => (
            <div key={index} className="bg-gray-50 rounded-3xl p-8 md:p-12">
              <div className="text-center mb-12">
                <div className={`bg-gradient-to-r ${contest.color} p-4 rounded-2xl w-fit mx-auto mb-6`}>
                  <Trophy className="h-16 w-16 text-white" />
                </div>
                <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  {contest.title}
                </h3>
                <p className="text-xl text-gray-600">{contest.subtitle}</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Catégories */}
                <div>
                  <div className="flex items-center mb-6">
                    <Users className="h-8 w-8 text-blue-600 mr-3" />
                    <h4 className="text-2xl font-bold text-gray-900">Catégories</h4>
                  </div>
                  <div className="space-y-4">
                    {contest.categories.map((category, catIndex) => (
                      <div key={catIndex} className="flex items-center space-x-3 bg-white p-4 rounded-xl shadow-sm">
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${contest.color}`}></div>
                        <span className="text-gray-700 font-medium">{category}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Critères d'évaluation */}
                <div>
                  <div className="flex items-center mb-6">
                    <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                    <h4 className="text-2xl font-bold text-gray-900">Critères d'Évaluation</h4>
                  </div>
                  <div className="space-y-4">
                    {contest.criteria.map((criterion, critIndex) => (
                      <div key={critIndex} className="flex items-center space-x-3 bg-white p-4 rounded-xl shadow-sm">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700">{criterion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Objectifs */}
              <div className="mt-12 bg-white rounded-2xl p-8">
                <h4 className="text-2xl font-bold text-gray-900 mb-6 text-center">Objectifs du Concours</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-100 p-2 rounded-lg mt-1">
                      <Trophy className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h5 className="font-bold text-gray-900 mb-2">Excellence Professionnelle</h5>
                      <p className="text-gray-600 text-sm">
                        Identifier et récompenser les meilleurs professionnels du secteur
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="bg-green-100 p-2 rounded-lg mt-1">
                      <Users className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h5 className="font-bold text-gray-900 mb-2">Valorisation des Métiers</h5>
                      <p className="text-gray-600 text-sm">
                        Mettre en lumière l'importance de ces professions essentielles
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to action */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 text-white">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Prêt à Participer ?
            </h3>
            <p className="text-xl mb-8 text-blue-100">
              Inscrivez-vous dès maintenant et montrez votre excellence !
            </p>
            <Link
              to="/inscriptions"
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 inline-flex items-center space-x-2"
            >
              <Trophy className="h-6 w-6" />
              <span>S'inscrire Maintenant</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contests;