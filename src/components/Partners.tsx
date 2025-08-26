import React from 'react';
import { Link } from 'react-router-dom';
import { Handshake, Download, Star, Building2, Globe, Users } from 'lucide-react';

const Partners = () => {
  return (
    <section id="partners" className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Partenaires & Sponsors
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Rejoignez-nous pour valoriser l'excellence dans les métiers du transport et du BTP au Sénégal
          </p>
        </div>

        {/* Appel aux sponsors */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 md:p-12 text-white text-center mb-16">
          <div className="bg-white/20 p-4 rounded-2xl w-fit mx-auto mb-8">
            <Handshake className="h-16 w-16 text-white" />
          </div>
          <h3 className="text-3xl md:text-4xl font-bold mb-6">
            Devenez Partenaire de cet Événement National
          </h3>
          <p className="text-xl mb-8 text-blue-100 max-w-3xl mx-auto">
            Associez votre marque à l'excellence et soutenez la valorisation des métiers essentiels 
            au développement économique du Sénégal. Une occasion unique de visibilité nationale.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/contact"
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 inline-flex items-center justify-center space-x-2"
            >
              <Download className="h-6 w-6" />
              <span>Télécharger le Dossier Sponsor</span>
            </Link>
            <Link
              to="/contact"
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-2 border-white/30 px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 inline-flex items-center justify-center space-x-2"
            >
              <Handshake className="h-6 w-6" />
              <span>Nous Contacter</span>
            </Link>
          </div>
        </div>

        {/* Avantages partenariat */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Avantages du Partenariat
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg transform hover:scale-105 transition-all duration-300">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 rounded-xl w-fit mb-6">
                <Globe className="h-12 w-12 text-white" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-4">Visibilité Nationale</h4>
              <p className="text-gray-600">
                Exposition de votre marque lors d'un événement d'envergure nationale 
                avec couverture médiatique garantie
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-lg transform hover:scale-105 transition-all duration-300">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4 rounded-xl w-fit mb-6">
                <Users className="h-12 w-12 text-white" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-4">Ciblage Précis</h4>
              <p className="text-gray-600">
                Accès direct aux professionnels du transport, du BTP et des secteurs connexes 
                à travers tout le Sénégal
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-lg transform hover:scale-105 transition-all duration-300">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 rounded-xl w-fit mb-6">
                <Star className="h-12 w-12 text-white" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-4">Image de Marque</h4>
              <p className="text-gray-600">
                Association à des valeurs d'excellence, de sécurité et de développement 
                professionnel reconnus
              </p>
            </div>
          </div>
        </div>

        {/* Types de partenariats */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Types de Partenariats
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-8 text-white">
              <h4 className="text-2xl font-bold mb-4">Partenaire Or</h4>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center space-x-2">
                  <Star className="h-5 w-5" />
                  <span>Logo principal sur tous supports</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Star className="h-5 w-5" />
                  <span>Stand privilégié</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Star className="h-5 w-5" />
                  <span>Intervention lors de la cérémonie</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Star className="h-5 w-5" />
                  <span>Droits exclusifs secteur</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-gray-300 to-gray-500 rounded-2xl p-8 text-white">
              <h4 className="text-2xl font-bold mb-4">Partenaire Argent</h4>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center space-x-2">
                  <Star className="h-5 w-5" />
                  <span>Logo sur supports officiels</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Star className="h-5 w-5" />
                  <span>Stand d'exposition</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Star className="h-5 w-5" />
                  <span>Mention lors de la cérémonie</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Star className="h-5 w-5" />
                  <span>Accès VIP</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-orange-600 to-red-600 rounded-2xl p-8 text-white">
              <h4 className="text-2xl font-bold mb-4">Partenaire Bronze</h4>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center space-x-2">
                  <Star className="h-5 w-5" />
                  <span>Logo sur site web</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Star className="h-5 w-5" />
                  <span>Espace d'exposition</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Star className="h-5 w-5" />
                  <span>Supports de communication</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Star className="h-5 w-5" />
                  <span>Invitations officielles</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Section logos sponsors (à remplir après signature) */}
        <div className="bg-white rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">
            Nos Partenaires Officiels
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center opacity-30">
            <div className="bg-gray-200 rounded-lg p-6 w-32 h-20 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
            <div className="bg-gray-200 rounded-lg p-6 w-32 h-20 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
            <div className="bg-gray-200 rounded-lg p-6 w-32 h-20 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
            <div className="bg-gray-200 rounded-lg p-6 w-32 h-20 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <p className="text-gray-500 mt-6">
            Les logos des sponsors officiels seront ajoutés après signature des partenariats
          </p>
        </div>
      </div>
    </section>
  );
};

export default Partners;