import React from 'react';
import { MapPin, Phone, Mail, Facebook, Linkedin, Youtube, Clock, Building2 } from 'lucide-react';

const Contact = () => {
  return (
    <section id="contact" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Contactez-Nous
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            L'équipe UPT est à votre disposition pour répondre à toutes vos questions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Informations de contact */}
          <div className="space-y-8">
            {/* UPT - Organisateur */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-8 text-white">
              <div className="flex items-center mb-6">
                <div className="bg-white/20 p-3 rounded-xl mr-4">
                  <Building2 className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Unité Pro Technique</h3>
                  <p className="text-blue-200">Organisateur Officiel</p>
                </div>
              </div>
              <p className="text-blue-100 leading-relaxed">
                L'UPT est fière d'organiser ces concours nationaux pour valoriser l'excellence 
                dans les métiers du transport et du BTP au Sénégal.
              </p>
            </div>

            {/* Adresse */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-r from-red-500 to-pink-500 p-3 rounded-xl">
                  <MapPin className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Adresse</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Unité Pro Technique (UPT)<br />
                    Rue X, Quartier Y<br />
                    Dakar, Sénégal
                  </p>
                </div>
              </div>
            </div>

            {/* Téléphone */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-3 rounded-xl">
                  <Phone className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Téléphone & WhatsApp</h3>
                  <div className="space-y-2">
                    <a 
                      href="tel:+221123456789" 
                      className="block text-green-600 hover:text-green-700 font-semibold transition-colors"
                    >
                      +221 12 345 67 89
                    </a>
                    <a 
                      href="https://wa.me/221123456789" 
                      className="block text-green-600 hover:text-green-700 font-semibold transition-colors"
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      WhatsApp: +221 12 345 67 89
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-3 rounded-xl">
                  <Mail className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Email Officiel</h3>
                  <div className="space-y-2">
                    <a 
                      href="mailto:contact@enginor-senegal.com" 
                      className="block text-purple-600 hover:text-purple-700 font-semibold transition-colors"
                    >
                      contact@enginor-senegal.com
                    </a>
                    <a 
                      href="mailto:inscription@enginor-senegal.com" 
                      className="block text-purple-600 hover:text-purple-700 font-semibold transition-colors"
                    >
                      inscription@enginor-senegal.com
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Horaires */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-3 rounded-xl">
                  <Clock className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Horaires d'Ouverture</h3>
                  <div className="space-y-1 text-gray-600">
                    <p>Lundi - Vendredi: 8h00 - 17h00</p>
                    <p>Samedi: 8h00 - 13h00</p>
                    <p>Dimanche: Fermé</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Réseaux sociaux et carte */}
          <div className="space-y-8">
            {/* Réseaux sociaux */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Suivez-Nous
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <a 
                  href="https://facebook.com/enginorvoldorsenegal" 
                  className="flex items-center space-x-4 bg-blue-50 hover:bg-blue-100 p-4 rounded-xl transition-all duration-300 transform hover:scale-105"
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <div className="bg-blue-600 p-3 rounded-lg">
                    <Facebook className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">Facebook</h4>
                    <p className="text-blue-600">@EnginOrVolantOrSenegal</p>
                  </div>
                </a>
                <a 
                  href="https://linkedin.com/company/upt-senegal" 
                  className="flex items-center space-x-4 bg-blue-50 hover:bg-blue-100 p-4 rounded-xl transition-all duration-300 transform hover:scale-105"
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <div className="bg-blue-700 p-3 rounded-lg">
                    <Linkedin className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">LinkedIn</h4>
                    <p className="text-blue-700">UPT Sénégal</p>
                  </div>
                </a>
                <a 
                  href="https://youtube.com/c/uptsenegal" 
                  className="flex items-center space-x-4 bg-red-50 hover:bg-red-100 p-4 rounded-xl transition-all duration-300 transform hover:scale-105"
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <div className="bg-red-600 p-3 rounded-lg">
                    <Youtube className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">YouTube</h4>
                    <p className="text-red-600">UPT Sénégal Officiel</p>
                  </div>
                </a>
              </div>
            </div>

            {/* Carte simulée */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Localisation
              </h3>
              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl p-8 text-center">
                <MapPin className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <p className="text-gray-700 mb-4">
                  Nous sommes situés au cœur de Dakar
                </p>
                <a 
                  href="https://maps.google.com" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-flex items-center space-x-2"
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <MapPin className="h-5 w-5" />
                  <span>Voir sur Google Maps</span>
                </a>
              </div>
            </div>

            {/* Informations supplémentaires */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Informations Utiles
              </h3>
              <div className="space-y-3 text-gray-600">
                <p>• Parking gratuit disponible</p>
                <p>• Accès handicapés</p>
                <p>• Transports publics: Bus 8, 12, 23</p>
                <p>• Métro: Station Colobane (10 min à pied)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Call to action final */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 text-center text-white">
          <h3 className="text-2xl md:text-3xl font-bold mb-4">
            Prêt à Nous Rejoindre ?
          </h3>
          <p className="text-xl mb-8 text-blue-100">
            N'hésitez pas à nous contacter pour toute question sur les concours
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="tel:+221123456789"
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 inline-flex items-center justify-center space-x-2"
            >
              <Phone className="h-6 w-6" />
              <span>Appelez Maintenant</span>
            </a>
            <a
              href="mailto:contact@enginor-senegal.com"
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-2 border-white/30 px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 inline-flex items-center justify-center space-x-2"
            >
              <Mail className="h-6 w-6" />
              <span>Envoyez un Email</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;