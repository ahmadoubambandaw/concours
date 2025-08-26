import React, { useState, useEffect } from 'react';

const Countdown = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const targetDate = new Date('2025-10-01T00:00:00').getTime();

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });

      if (difference < 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 max-w-2xl mx-auto">
      <h3 className="text-2xl font-bold text-white mb-6 text-center">
        Début des concours dans :
      </h3>
      <div className="grid grid-cols-4 gap-4 text-center">
        <div className="bg-orange-500/20 rounded-lg p-4">
          <div className="text-3xl md:text-4xl font-bold text-white">
            {timeLeft.days.toString().padStart(2, '0')}
          </div>
          <div className="text-orange-300 text-sm mt-1">JOURS</div>
        </div>
        <div className="bg-orange-500/20 rounded-lg p-4">
          <div className="text-3xl md:text-4xl font-bold text-white">
            {timeLeft.hours.toString().padStart(2, '0')}
          </div>
          <div className="text-orange-300 text-sm mt-1">HEURES</div>
        </div>
        <div className="bg-orange-500/20 rounded-lg p-4">
          <div className="text-3xl md:text-4xl font-bold text-white">
            {timeLeft.minutes.toString().padStart(2, '0')}
          </div>
          <div className="text-orange-300 text-sm mt-1">MIN</div>
        </div>
        <div className="bg-orange-500/20 rounded-lg p-4">
          <div className="text-3xl md:text-4xl font-bold text-white">
            {timeLeft.seconds.toString().padStart(2, '0')}
          </div>
          <div className="text-orange-300 text-sm mt-1">SEC</div>
        </div>
      </div>
    </div>
  );
};

export default Countdown;