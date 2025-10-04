import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Droplet, Heart, Award, Users, MapPin, Bell } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-orange-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-4 rounded-full">
                <Droplet className="w-16 h-16 text-white" />
              </div>
            </div>
            <h1 className="text-6xl font-bold text-gray-900 mb-6" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
              BloodBridge
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Connecting donors with those in need. Save lives with every donation.
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                data-testid="get-started-btn"
                onClick={() => navigate('/register')}
                className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Get Started
              </Button>
              <Button
                data-testid="login-btn"
                onClick={() => navigate('/login')}
                variant="outline"
                className="border-2 border-teal-500 text-teal-600 hover:bg-teal-50 px-8 py-6 text-lg rounded-xl"
              >
                Login
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">
          Why Choose BloodBridge?
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="p-6 hover:shadow-xl transition-all duration-300 border-2 border-teal-100">
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-900">Real-time Matching</h3>
            <p className="text-gray-600">
              Get instantly notified when someone nearby needs your blood type
            </p>
          </Card>

          <Card className="p-6 hover:shadow-xl transition-all duration-300 border-2 border-orange-100">
            <div className="bg-gradient-to-br from-orange-500 to-amber-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-900">GPS Tracking</h3>
            <p className="text-gray-600">
              Find requests within 50km radius using smart location tracking
            </p>
          </Card>

          <Card className="p-6 hover:shadow-xl transition-all duration-300 border-2 border-emerald-100">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Award className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-900">Gamification</h3>
            <p className="text-gray-600">
              Earn points, unlock badges, and compete on leaderboards
            </p>
          </Card>

          <Card className="p-6 hover:shadow-xl transition-all duration-300 border-2 border-teal-100">
            <div className="bg-gradient-to-br from-teal-500 to-cyan-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-900">Smart Alerts</h3>
            <p className="text-gray-600">
              Receive SMS and email notifications for urgent blood requests
            </p>
          </Card>

          <Card className="p-6 hover:shadow-xl transition-all duration-300 border-2 border-orange-100">
            <div className="bg-gradient-to-br from-orange-500 to-red-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-900">Community</h3>
            <p className="text-gray-600">
              Join thousands of donors making a difference every day
            </p>
          </Card>

          <Card className="p-6 hover:shadow-xl transition-all duration-300 border-2 border-emerald-100">
            <div className="bg-gradient-to-br from-emerald-500 to-green-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Droplet className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-900">Blockchain Verified</h3>
            <p className="text-gray-600">
              All donations tracked with blockchain for transparency
            </p>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-600 py-16 mt-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Save Lives?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join our community of heroes and make a difference today
          </p>
          <Button
            data-testid="cta-register-btn"
            onClick={() => navigate('/register')}
            className="bg-white text-teal-600 hover:bg-gray-100 px-8 py-6 text-lg rounded-xl shadow-lg"
          >
            Register Now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Landing;
