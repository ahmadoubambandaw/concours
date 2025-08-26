import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, Award } from 'lucide-react';
import Countdown from './Countdown';

const Hero = () => {
  return (
    <section id="home" className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 min-h-screen flex items-center">
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/40"></div>
      
      {/* Background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
        style={{
          backgroundImage: "url('https://images.pexels.com/photos/1216589/pexels-photo-1216589.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1')"
        }}
      ></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          {/* Logo et titre principal */}
          <div className="flex justify-center mb-8">
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl">
              <Trophy className="h-16 w-16 text-orange-400 mx-auto mb-4" />
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-2">
                Engin d'Or & Volant d'Or
              </h1>
              <p className="text-xl md:text-2xl text-orange-300 font-semibold">
                Sénégal 2025
              </p>
            </div>
          </div>

          {/* Slogan */}
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 max-w-4xl mx-auto leading-tight">
            Excellence, Sécurité et Valorisation des Métiers du Transport
          </h2>

          {/* Description */}
          <p className="text-lg md:text-xl text-gray-200 mb-12 max-w-4xl mx-auto leading-relaxed">
            Bienvenue sur la plateforme officielle des concours nationaux Engin d'Or et Volant d'Or Sénégal. 
            Une initiative pour valoriser les métiers du transport, du BTP et de la sécurité routière.
          </p>

          {/* Compteur */}
          <div className="mb-12">
            <Countdown />
          </div>

          {/* Boutons d'action */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/inscriptions"
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-xl"
            >
              S'inscrire au Concours
            </Link>
            <Link
              to="/partenaires"
              className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border-2 border-white/30 px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105"
            >
              Devenir Sponsor
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg">
              <Trophy className="h-12 w-12 text-orange-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white">2 Concours</h3>
              <p className="text-gray-300">Engin d'Or & Volant d'Or</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg">
              <Users className="h-12 w-12 text-orange-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white">National</h3>
              <p className="text-gray-300">Ouvert à tout le Sénégal</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg">
              <Award className="h-12 w-12 text-orange-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white">Excellence</h3>
              <p className="text-gray-300">Valorisation des métiers</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;