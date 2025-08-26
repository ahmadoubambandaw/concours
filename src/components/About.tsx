import React from 'react';
import { Target, Eye, Building2, Truck, Shield, Award } from 'lucide-react';

const About = () => {
  return (
    <section id="about" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête de section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            À Propos des Concours
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Deux concours d'excellence pour valoriser les métiers essentiels du transport et du BTP au Sénégal
          </p>
        </div>

        {/* Les deux concours */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
          {/* Engin d'Or */}
          <div className="bg-white rounded-2xl shadow-xl p-8 transform hover:scale-105 transition-all duration-300">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 rounded-xl w-fit mb-6">
              <Building2 className="h-12 w-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Engin d'Or Sénégal</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Concours national destiné à identifier et récompenser le meilleur conducteur d'engins de BTP, 
              manutention et mines du Sénégal. Une compétition qui met en valeur la technicité et la sécurité 
              dans la conduite d'équipements lourds.
            </p>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-gray-700">Engins de chantier BTP</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-gray-700">Équipements de manutention</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-gray-700">Machines d'extraction minière</span>
              </div>
            </div>
          </div>

          {/* Volant d'Or */}
          <div className="bg-white rounded-2xl shadow-xl p-8 transform hover:scale-105 transition-all duration-300">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4 rounded-xl w-fit mb-6">
              <Truck className="h-12 w-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Volant d'Or Sénégal</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Compétition nationale pour distinguer le meilleur conducteur routier du Sénégal. 
              Ce concours valorise la conduite responsable, la sécurité routière et l'excellence 
              dans le transport de personnes et de marchandises.
            </p>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-700">Transport de voyageurs</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-700">Transport de marchandises</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-700">Conduite urbaine et interurbaine</span>
              </div>
            </div>
          </div>
        </div>

        {/* Vision & Mission */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="text-center">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4 rounded-xl w-fit mx-auto mb-4">
              <Shield className="h-12 w-12 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Sécurité</h3>
            <p className="text-gray-600">
              Promouvoir les meilleures pratiques de sécurité dans la conduite d'engins et de véhicules
            </p>
          </div>
          <div className="text-center">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 rounded-xl w-fit mx-auto mb-4">
              <Award className="h-12 w-12 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Excellence</h3>
            <p className="text-gray-600">
              Reconnaître et récompenser l'excellence technique et professionnelle des conducteurs
            </p>
          </div>
          <div className="text-center">
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-4 rounded-xl w-fit mx-auto mb-4">
              <Target className="h-12 w-12 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Valorisation</h3>
            <p className="text-gray-600">
              Valoriser les métiers du transport et du BTP essentiels au développement du pays
            </p>
          </div>
        </div>

        {/* Organisateur */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-center text-white">
          <div className="bg-white/20 p-4 rounded-xl w-fit mx-auto mb-6">
            <Building2 className="h-12 w-12 text-white" />
          </div>
          <h3 className="text-2xl font-bold mb-4">Organisateur</h3>
          <p className="text-xl mb-2">Unité Pro Technique (UPT)</p>
          <p className="text-blue-200 max-w-2xl mx-auto">
            L'UPT s'engage à organiser ces concours dans le respect des plus hauts standards de 
            professionnalisme et d'équité, pour une reconnaissance méritée des talents sénégalais.
          </p>
        </div>
      </div>
    </section>
  );
};

export default About;