import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Facebook, Linkedin, Youtube, Mail, Phone, MapPin, Heart } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Contenu principal du footer */}
        <div className="py-16 grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo et description */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-gradient-to-r from-blue-600 to-orange-500 p-3 rounded-lg">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Engin d'Or & Volant d'Or</h3>
                <p className="text-gray-400">Sénégal 2025</p>
              </div>
            </div>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Les concours nationaux de référence pour valoriser l'excellence dans les métiers 
              du transport, du BTP et de la sécurité routière au Sénégal.
            </p>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-blue-400" />
                <span className="text-gray-300">Dakar, Sénégal</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-green-400" />
                <a href="tel:+221123456789" className="text-gray-300 hover:text-white transition-colors">
                  +221 12 345 67 89
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-purple-400" />
                <a href="mailto:contact@enginor-senegal.com" className="text-gray-300 hover:text-white transition-colors">
                  contact@enginor-senegal.com
                </a>
              </div>
            </div>
          </div>

          {/* Liens rapides */}
          <div>
            <h4 className="text-lg font-bold mb-6">Liens Rapides</h4>
            <div className="space-y-3">
              <Link to="/" className="block text-gray-300 hover:text-white transition-colors">
                Accueil
              </Link>
              <Link to="/concours" className="block text-gray-300 hover:text-white transition-colors">
                Concours
              </Link>
              <Link to="/inscriptions" className="block text-gray-300 hover:text-white transition-colors">
                Inscriptions
              </Link>
              <Link to="/partenaires" className="block text-gray-300 hover:text-white transition-colors">
                Partenaires
              </Link>
              <Link to="/contact" className="block text-gray-300 hover:text-white transition-colors">
                Contact
              </Link>
            </div>
          </div>

          {/* Réseaux sociaux */}
          <div>
            <h4 className="text-lg font-bold mb-6">Suivez-Nous</h4>
            <div className="space-y-4">
              <a 
                href="https://facebook.com/enginorvoldorsenegal" 
                className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors"
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Facebook className="h-5 w-5" />
                <span>Facebook</span>
              </a>
              <a 
                href="https://linkedin.com/company/upt-senegal" 
                className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors"
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Linkedin className="h-5 w-5" />
                <span>LinkedIn</span>
              </a>
              <a 
                href="https://youtube.com/c/uptsenegal" 
                className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors"
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Youtube className="h-5 w-5" />
                <span>YouTube</span>
              </a>
            </div>
            <div className="mt-8">
              <h5 className="font-semibold mb-3">Newsletter</h5>
              <p className="text-gray-400 text-sm mb-4">
                Recevez les dernières actualités des concours
              </p>
              <div className="flex">
                <input
                  type="email"
                  placeholder="Votre email"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-r-lg transition-colors">
                  <Mail className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Barre de copyright */}
        <div className="border-t border-gray-800 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-gray-400 text-sm">
              © {currentYear} Engin d'Or & Volant d'Or Sénégal. Tous droits réservés.
            </div>
            <div className="flex items-center space-x-2 text-gray-400 text-sm">
              <span>Organisé avec</span>
              <Heart className="h-4 w-4 text-red-500" />
              <span>par</span>
              <span className="text-white font-semibold">UPT (Unité Pro Technique)</span>
            </div>
            <div className="flex space-x-6 text-gray-400 text-sm">
              <a href="#" className="hover:text-white transition-colors">
                Mentions légales
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Politique de confidentialité
              </a>
              <a href="#" className="hover:text-white transition-colors">
                CGU
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;