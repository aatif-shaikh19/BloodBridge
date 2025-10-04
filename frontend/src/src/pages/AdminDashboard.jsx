import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { 
  Users, Activity, Droplet, AlertCircle, CheckCircle2, 
  XCircle, LogOut, Plus, FileText, TrendingUp 
} from 'lucide-react';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const { logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [donors, setDonors] = useState([]);
  const [activeRequests, setActiveRequests] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createRequestOpen, setCreateRequestOpen] = useState(false);
  const [updateInventoryOpen, setUpdateInventoryOpen] = useState(false);
  
  const [requestForm, setRequestForm] = useState({
    hospital_name: '',
    blood_type: '',
    units_needed: 1,
    urgency: 'medium',
    patient_name: '',
    contact_person: '',
    contact_phone: '',
    latitude: 0,
    longitude: 0,
  });

  const [inventoryForm, setInventoryForm] = useState({
    blood_type: '',
    units_available: 0,
    temperature: 4.0,
    location: 'Central Blood Bank',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, pendingRes, donorsRes, requestsRes, inventoryRes] = await Promise.all([
        api.get('/admin/statistics'),
        api.get('/admin/pending-users'),
        api.get('/admin/donors'),
        api.get('/requests/active'),
        api.get('/inventory/all'),
      ]);

      setStats(statsRes.data);
      setPendingUsers(pendingRes.data);
      setDonors(donorsRes.data);
      setActiveRequests(requestsRes.data);
      setInventory(inventoryRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    }
    setLoading(false);
  };

  const handleApproveUser = async (userId) => {
    try {
      await api.post(`/admin/approve-user/${userId}`);
      toast.success('User approved successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to approve user');
    }
  };

  const handleRejectUser = async (userId) => {
    try {
      await api.delete(`/admin/reject-user/${userId}`);
      toast.success('User rejected');
      fetchData();
    } catch (error) {
      toast.error('Failed to reject user');
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/requests/create', requestForm);
      toast.success(`Request created! ${response.data.donors_notified} donors notified`);
      setCreateRequestOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to create request');
    }
  };

  const handleUpdateInventory = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/inventory/update', inventoryForm);
      toast.success('Inventory updated successfully');
      setUpdateInventoryOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to update inventory');
    }
  };

  const getInventoryStatus = (units) => {
    if (units < 10) return { label: 'Critical', color: 'bg-red-500', text: 'text-red-900' };
    if (units < 20) return { label: 'Low', color: 'bg-orange-500', text: 'text-orange-900' };
    return { label: 'Good', color: 'bg-green-500', text: 'text-green-900' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <Droplet className="w-16 h-16 text-teal-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-orange-50" data-testid="admin-dashboard">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white py-6 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Droplet className="w-10 h-10" />
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-white/80">Blood Donation Management</p>
            </div>
          </div>
          <Button
            onClick={logout}
            variant="outline"
            className="border-white text-white hover:bg-white/10"
            data-testid="admin-logout-btn"
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
                <p className="text-white/80 text-sm">Total Donors</p>
                <p className="text-3xl font-bold">{stats?.total_donors || 0}</p>
              </div>
              <Users className="w-12 h-12 text-white/50" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-orange-500 to-amber-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Pending Approvals</p>
                <p className="text-3xl font-bold">{stats?.pending_approvals || 0}</p>
              </div>
              <AlertCircle className="w-12 h-12 text-white/50" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Active Requests</p>
                <p className="text-3xl font-bold">{stats?.active_requests || 0}</p>
              </div>
              <Activity className="w-12 h-12 text-white/50" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-500 to-pink-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Total Donations</p>
                <p className="text-3xl font-bold">{stats?.total_donations || 0}</p>
              </div>
              <Droplet className="w-12 h-12 text-white/50" />
            </div>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="pending" data-testid="pending-tab">
              <AlertCircle className="w-4 h-4 mr-2" />
              Pending ({pendingUsers.length})
            </TabsTrigger>
            <TabsTrigger value="donors" data-testid="donors-tab">
              <Users className="w-4 h-4 mr-2" />
              Donors
            </TabsTrigger>
            <TabsTrigger value="requests" data-testid="requests-tab">
              <Activity className="w-4 h-4 mr-2" />
              Requests
            </TabsTrigger>
            <TabsTrigger value="inventory" data-testid="inventory-tab">
              <Droplet className="w-4 h-4 mr-2" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="analytics-tab">
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Pending Approvals Tab */}
          <TabsContent value="pending">
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-900">Pending User Approvals</h3>
              {pendingUsers.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600">No pending approvals</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingUsers.map((user) => (
                    <Card key={user.id} className="p-4 border-2 border-orange-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-gray-900">
                            {user.donor_info?.name || 'N/A'}
                          </h4>
                          <div className="text-sm text-gray-600 space-y-1 mt-2">
                            <p><strong>Email:</strong> {user.email}</p>
                            <p><strong>Phone:</strong> {user.phone}</p>
                            <p><strong>Blood Type:</strong> {user.donor_info?.blood_type}</p>
                            <p><strong>Address:</strong> {user.donor_info?.address}, {user.donor_info?.city}, {user.donor_info?.state}</p>
                            <p><strong>Aadhaar:</strong> {user.donor_info?.aadhaar_number}</p>
                            {user.donor_info?.aadhaar_file && (
                              <Button
                                variant="link"
                                className="p-0 h-auto"
                                onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}/api/uploads/documents/${user.donor_info.aadhaar_file}`, '_blank')}
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                View Aadhaar Document
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2">
                          <Button
                            onClick={() => handleApproveUser(user.id)}
                            className="bg-green-500 hover:bg-green-600"
                            data-testid={`approve-user-${user.id}`}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleRejectUser(user.id)}
                            variant="destructive"
                            data-testid={`reject-user-${user.id}`}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Donors Tab */}
          <TabsContent value="donors">
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-900">Approved Donors</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Blood Type</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Donations</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {donors.map((donor) => (
                    <TableRow key={donor.id}>
                      <TableCell className="font-medium">{donor.name}</TableCell>
                      <TableCell>{donor.blood_type}</TableCell>
                      <TableCell>{donor.email}</TableCell>
                      <TableCell>{donor.phone}</TableCell>
                      <TableCell>{donor.city}</TableCell>
                      <TableCell>{donor.total_donations}</TableCell>
                      <TableCell>{donor.points}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          donor.availability_status === 'available' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {donor.availability_status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Blood Requests</h3>
                <Dialog open={createRequestOpen} onOpenChange={setCreateRequestOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-teal-500 to-emerald-600" data-testid="create-request-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Request
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create Blood Request</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateRequest} className="space-y-4">
                      <div>
                        <Label>Hospital Name</Label>
                        <Input
                          value={requestForm.hospital_name}
                          onChange={(e) => setRequestForm({ ...requestForm, hospital_name: e.target.value })}
                          required
                          data-testid="request-hospital-input"
                        />
                      </div>
                      <div>
                        <Label>Blood Type</Label>
                        <Select
                          value={requestForm.blood_type}
                          onValueChange={(value) => setRequestForm({ ...requestForm, blood_type: value })}
                        >
                          <SelectTrigger data-testid="request-blood-type-select">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Units Needed</Label>
                        <Input
                          type="number"
                          min="1"
                          value={requestForm.units_needed}
                          onChange={(e) => setRequestForm({ ...requestForm, units_needed: parseInt(e.target.value) })}
                          required
                        />
                      </div>
                      <div>
                        <Label>Urgency</Label>
                        <Select
                          value={requestForm.urgency}
                          onValueChange={(value) => setRequestForm({ ...requestForm, urgency: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Patient Name (Optional)</Label>
                        <Input
                          value={requestForm.patient_name}
                          onChange={(e) => setRequestForm({ ...requestForm, patient_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Contact Phone</Label>
                        <Input
                          value={requestForm.contact_phone}
                          onChange={(e) => setRequestForm({ ...requestForm, contact_phone: e.target.value })}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full" data-testid="submit-request-btn">
                        Create Request & Notify Donors
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="space-y-4">
                {activeRequests.map((request) => (
                  <Card key={request.id} className="p-4 border-2 border-teal-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-lg text-gray-900">{request.hospital_name}</h4>
                        <div className="text-sm text-gray-600 space-y-1 mt-2">
                          <p><strong>Blood Type:</strong> {request.blood_type}</p>
                          <p><strong>Units:</strong> {request.units_fulfilled}/{request.units_needed}</p>
                          <p><strong>Urgency:</strong> <span className="uppercase font-semibold">{request.urgency}</span></p>
                          {request.patient_name && <p><strong>Patient:</strong> {request.patient_name}</p>}
                          <p><strong>Contact:</strong> {request.contact_phone}</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Blood Inventory</h3>
                <Dialog open={updateInventoryOpen} onOpenChange={setUpdateInventoryOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-teal-500 to-emerald-600" data-testid="update-inventory-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      Update Inventory
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Update Blood Inventory</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdateInventory} className="space-y-4">
                      <div>
                        <Label>Blood Type</Label>
                        <Select
                          value={inventoryForm.blood_type}
                          onValueChange={(value) => setInventoryForm({ ...inventoryForm, blood_type: value })}
                        >
                          <SelectTrigger data-testid="inventory-blood-type-select">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Units Available</Label>
                        <Input
                          type="number"
                          min="0"
                          value={inventoryForm.units_available}
                          onChange={(e) => setInventoryForm({ ...inventoryForm, units_available: parseInt(e.target.value) })}
                          required
                          data-testid="inventory-units-input"
                        />
                      </div>
                      <div>
                        <Label>Temperature (°C)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={inventoryForm.temperature}
                          onChange={(e) => setInventoryForm({ ...inventoryForm, temperature: parseFloat(e.target.value) })}
                          required
                        />
                      </div>
                      <div>
                        <Label>Location</Label>
                        <Input
                          value={inventoryForm.location}
                          onChange={(e) => setInventoryForm({ ...inventoryForm, location: e.target.value })}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full" data-testid="submit-inventory-btn">
                        Update Inventory
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid md:grid-cols-4 gap-4">
                {inventory.map((item) => {
                  const status = getInventoryStatus(item.units_available);
                  return (
                    <Card key={item.id} className="p-4">
                      <div className="text-center">
                        <div className={`w-16 h-16 ${status.color} rounded-full flex items-center justify-center mx-auto mb-3`}>
                          <span className="text-2xl font-bold text-white">{item.blood_type}</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{item.units_available}</p>
                        <p className="text-sm text-gray-600">units available</p>
                        <div className={`mt-2 px-2 py-1 rounded text-xs ${status.text} bg-opacity-20`} style={{backgroundColor: status.color.replace('bg-', '')}}>
                          {status.label}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-900">Blood Type Distribution</h3>
              <div className="grid md:grid-cols-4 gap-4 mb-8">
                {stats?.blood_type_distribution?.map((item) => (
                  <Card key={item.blood_type} className="p-4 bg-teal-50">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-teal-600">{item.blood_type}</p>
                      <p className="text-3xl font-bold text-gray-900">{item.count}</p>
                      <p className="text-sm text-gray-600">donors</p>
                    </div>
                  </Card>
                ))}
              </div>

              <h3 className="text-xl font-bold mb-4 text-gray-900">Recent Donations</h3>
              <div className="space-y-3">
                {stats?.recent_activity?.map((activity, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-900">{activity.donor}</p>
                        <p className="text-sm text-gray-600">
                          Donated {activity.units} unit(s) to {activity.hospital}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">{new Date(activity.date).toLocaleDateString()}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
