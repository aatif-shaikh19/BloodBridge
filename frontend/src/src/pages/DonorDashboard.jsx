import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Droplet, Heart, Award, MapPin, Bell, TrendingUp, 
  LogOut, AlertCircle, CheckCircle2, Trophy, Star 
} from 'lucide-react';
import { toast } from 'sonner';

const DonorDashboard = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [nearbyRequests, setNearbyRequests] = useState([]);
  const [donations, setDonations] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, requestsRes, donationsRes, leaderboardRes] = await Promise.all([
        api.get('/donor/profile'),
        api.get('/requests/nearby'),
        api.get('/donations/my-donations'),
        api.get('/leaderboard'),
      ]);

      setProfile(profileRes.data);
      setNearbyRequests(requestsRes.data);
      setDonations(donationsRes.data);
      setLeaderboard(leaderboardRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    }
    setLoading(false);
  };

  const handleDonate = async (requestId) => {
    try {
      const response = await api.post('/donations/respond', {
        request_id: requestId,
        units_donated: 1,
      });

      toast.success(response.data.message);
      fetchData(); // Refresh data
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record donation');
    }
  };

  const handleToggleAvailability = async () => {
    try {
      const response = await api.post('/donor/toggle-availability');
      toast.success(response.data.message);
      fetchData();
    } catch (error) {
      toast.error('Failed to update availability');
    }
  };

  const getBadgeDetails = (badge) => {
    const badges = {
      first_hero: { name: 'First Hero', icon: '🌟', color: 'bg-yellow-100 text-yellow-800' },
      bronze_saver: { name: 'Bronze Saver', icon: '🥉', color: 'bg-orange-100 text-orange-800' },
      silver_guardian: { name: 'Silver Guardian', icon: '🥈', color: 'bg-gray-100 text-gray-800' },
      gold_champion: { name: 'Gold Champion', icon: '🥇', color: 'bg-yellow-100 text-yellow-800' },
      platinum_legend: { name: 'Platinum Legend', icon: '💎', color: 'bg-purple-100 text-purple-800' },
    };
    return badges[badge] || { name: badge, icon: '🏅', color: 'bg-blue-100 text-blue-800' };
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-100 border-red-500 text-red-900';
      case 'high':
        return 'bg-orange-100 border-orange-500 text-orange-900';
      case 'medium':
        return 'bg-yellow-100 border-yellow-500 text-yellow-900';
      default:
        return 'bg-green-100 border-green-500 text-green-900';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <Droplet className="w-16 h-16 text-teal-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-orange-50" data-testid="donor-dashboard">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white py-6 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Droplet className="w-10 h-10" />
            <div>
              <h1 className="text-2xl font-bold">Welcome, {profile?.name}!</h1>
              <p className="text-white/80">Donor Dashboard</p>
            </div>
          </div>
          <Button
            onClick={logout}
            variant="outline"
            className="border-white text-white hover:bg-white/10"
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Total Donations</p>
                <p className="text-3xl font-bold">{profile?.total_donations || 0}</p>
              </div>
              <Heart className="w-12 h-12 text-white/50" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-orange-500 to-amber-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Points Earned</p>
                <p className="text-3xl font-bold">{profile?.points || 0}</p>
              </div>
              <Star className="w-12 h-12 text-white/50" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Blood Type</p>
                <p className="text-3xl font-bold">{profile?.blood_type}</p>
              </div>
              <Droplet className="w-12 h-12 text-white/50" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-500 to-pink-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Badges</p>
                <p className="text-3xl font-bold">{profile?.badges?.length || 0}</p>
              </div>
              <Award className="w-12 h-12 text-white/50" />
            </div>
          </Card>
        </div>

        {/* Availability Toggle */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Availability Status</h3>
              <p className="text-gray-600">
                {profile?.availability_status === 'available'
                  ? 'You will receive notifications for blood requests'
                  : 'You are currently unavailable for donations'}
              </p>
            </div>
            <Button
              onClick={handleToggleAvailability}
              className={
                profile?.availability_status === 'available'
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-gray-500 hover:bg-gray-600'
              }
            >
              {profile?.availability_status === 'available' ? 'Available' : 'Unavailable'}
            </Button>
          </div>
        </Card>

        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="requests" data-testid="requests-tab">
              <Bell className="w-4 h-4 mr-2" />
              Nearby Requests
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="history-tab">
              <TrendingUp className="w-4 h-4 mr-2" />
              My Donations
            </TabsTrigger>
            <TabsTrigger value="badges" data-testid="badges-tab">
              <Award className="w-4 h-4 mr-2" />
              Badges
            </TabsTrigger>
            <TabsTrigger value="leaderboard" data-testid="leaderboard-tab">
              <Trophy className="w-4 h-4 mr-2" />
              Leaderboard
            </TabsTrigger>
          </TabsList>

          {/* Nearby Requests Tab */}
          <TabsContent value="requests" className="space-y-4">
            {nearbyRequests.length === 0 ? (
              <Card className="p-8 text-center">
                <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No nearby blood requests at the moment</p>
              </Card>
            ) : (
              nearbyRequests.map((request) => (
                <Card
                  key={request.id}
                  className={`p-6 border-2 ${getUrgencyColor(request.urgency)}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-bold">{request.hospital_name}</h3>
                        <Badge variant="outline" className="uppercase">
                          {request.urgency}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p>
                          <strong>Blood Type:</strong> {request.blood_type}
                        </p>
                        <p>
                          <strong>Units Needed:</strong> {request.units_needed - request.units_fulfilled}
                        </p>
                        <p>
                          <strong>Distance:</strong> {request.distance} km away
                        </p>
                        {request.patient_name && (
                          <p>
                            <strong>Patient:</strong> {request.patient_name}
                          </p>
                        )}
                        {request.contact_phone && (
                          <p>
                            <strong>Contact:</strong> {request.contact_phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDonate(request.id)}
                      className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700"
                      data-testid={`donate-btn-${request.id}`}
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      Donate Now
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Donation History Tab */}
          <TabsContent value="history" className="space-y-4">
            {donations.length === 0 ? (
              <Card className="p-8 text-center">
                <Droplet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No donation history yet</p>
              </Card>
            ) : (
              donations.map((donation) => (
                <Card key={donation.id} className="p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-lg">{donation.hospital}</h3>
                      <p className="text-gray-600">
                        {donation.units} unit(s) • {new Date(donation.date).toLocaleDateString()}
                      </p>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Badges Tab */}
          <TabsContent value="badges">
            <Card className="p-6">
              {profile?.badges && profile.badges.length > 0 ? (
                <div className="grid md:grid-cols-3 gap-4">
                  {profile.badges.map((badge) => {
                    const details = getBadgeDetails(badge);
                    return (
                      <div
                        key={badge}
                        className={`p-6 rounded-lg text-center ${details.color}`}
                      >
                        <div className="text-4xl mb-2">{details.icon}</div>
                        <h3 className="font-bold">{details.name}</h3>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Start donating to earn badges!
                  </p>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-900">Top Donors</h3>
              <div className="space-y-3">
                {leaderboard.map((donor, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          index === 0
                            ? 'bg-yellow-400 text-yellow-900'
                            : index === 1
                            ? 'bg-gray-300 text-gray-900'
                            : index === 2
                            ? 'bg-orange-400 text-orange-900'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{donor.name}</p>
                        <p className="text-sm text-gray-600">
                          {donor.blood_type} • {donor.total_donations} donations
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-teal-600">{donor.points}</p>
                      <p className="text-xs text-gray-500">points</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DonorDashboard;
