import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Droplet, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const Register = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    blood_type: '',
    otp: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    latitude: 0,
    longitude: 0,
    aadhaar_number: '',
    aadhaar_file: null,
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, aadhaar_file: e.target.files[0] });
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          toast.success('Location captured!');
        },
        (error) => {
          toast.error('Could not get location');
        }
      );
    }
  };

  const handleInitialSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        blood_type: formData.blood_type,
        role: 'donor',
      });

      setUserId(response.data.user_id);
      toast.success(response.data.message);
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    }

    setLoading(false);
  };

  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/verify-otp', {
        user_id: userId,
        otp: formData.otp,
      });

      toast.success('OTP verified!');
      setStep(3);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'OTP verification failed');
    }

    setLoading(false);
  };

  const handleResendOTP = async () => {
    try {
      await api.post('/resend-otp', { user_id: userId });
      toast.success('New OTP sent!');
    } catch (error) {
      toast.error('Failed to resend OTP');
    }
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.aadhaar_file) {
      toast.error('Please upload Aadhaar document');
      return;
    }

    setLoading(true);

    try {
      const finalFormData = new FormData();
      finalFormData.append('user_id', userId);
      finalFormData.append('address', formData.address);
      finalFormData.append('city', formData.city);
      finalFormData.append('state', formData.state);
      finalFormData.append('pincode', formData.pincode);
      finalFormData.append('latitude', formData.latitude);
      finalFormData.append('longitude', formData.longitude);
      finalFormData.append('aadhaar_number', formData.aadhaar_number);
      finalFormData.append('aadhaar_file', formData.aadhaar_file);

      await api.post('/complete-registration', finalFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Registration complete! Awaiting admin approval.');
      setStep(4);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to complete registration');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-3 rounded-full">
            <Droplet className="w-12 h-12 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">
          {step === 4 ? 'Registration Complete!' : 'Register as Donor'}
        </h1>
        
        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    step >= s
                      ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step > s ? <CheckCircle2 className="w-6 h-6" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-12 h-1 ${
                      step > s ? 'bg-teal-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Basic Information */}
        {step === 1 && (
          <form onSubmit={handleInitialSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                data-testid="register-name-input"
                placeholder="John Doe"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                data-testid="register-email-input"
                placeholder="john@example.com"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                data-testid="register-phone-input"
                placeholder="+1234567890"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="blood_type">Blood Type</Label>
              <Select
                name="blood_type"
                value={formData.blood_type}
                onValueChange={(value) => setFormData({ ...formData, blood_type: value })}
                required
              >
                <SelectTrigger className="mt-1" data-testid="register-blood-type-select">
                  <SelectValue placeholder="Select blood type" />
                </SelectTrigger>
                <SelectContent>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                data-testid="register-password-input"
                placeholder="••••••••"
                className="mt-1"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="register-step1-submit"
              className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white py-6"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </form>
        )}

        {/* Step 2: OTP Verification */}
        {step === 2 && (
          <form onSubmit={handleOTPSubmit} className="space-y-4">
            <p className="text-center text-gray-600 mb-4">
              Enter the 6-digit OTP sent to your email and phone
            </p>

            <div>
              <Label htmlFor="otp">OTP Code</Label>
              <Input
                id="otp"
                name="otp"
                value={formData.otp}
                onChange={handleChange}
                required
                data-testid="register-otp-input"
                placeholder="123456"
                maxLength={6}
                className="mt-1 text-center text-2xl tracking-widest"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="register-otp-submit"
              className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white py-6"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify OTP'
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleResendOTP}
              className="w-full"
            >
              Resend OTP
            </Button>
          </form>
        )}

        {/* Step 3: Address & Aadhaar */}
        {step === 3 && (
          <form onSubmit={handleFinalSubmit} className="space-y-4">
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                data-testid="register-address-input"
                placeholder="Street address"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  placeholder="City"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  required
                  placeholder="State"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                required
                placeholder="123456"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Location (GPS)</Label>
              <Button
                type="button"
                variant="outline"
                onClick={getLocation}
                className="w-full mt-1"
                data-testid="get-location-btn"
              >
                {formData.latitude !== 0 ? '✓ Location Captured' : 'Capture Location'}
              </Button>
            </div>

            <div>
              <Label htmlFor="aadhaar_number">Aadhaar Number</Label>
              <Input
                id="aadhaar_number"
                name="aadhaar_number"
                value={formData.aadhaar_number}
                onChange={handleChange}
                required
                placeholder="1234 5678 9012"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="aadhaar_file">Aadhaar Document (PDF/Image)</Label>
              <Input
                id="aadhaar_file"
                name="aadhaar_file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                required
                data-testid="aadhaar-file-input"
                className="mt-1"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="register-final-submit"
              className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white py-6"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Complete Registration'
              )}
            </Button>
          </form>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <CheckCircle2 className="w-20 h-20 text-green-500" />
            </div>
            <p className="text-lg text-gray-600">
              Your registration is complete! An admin will review your application.
              You'll receive an email once approved.
            </p>
            <Button
              onClick={() => navigate('/login')}
              className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white px-8 py-6"
            >
              Go to Login
            </Button>
          </div>
        )}

        {step < 4 && (
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-teal-600 hover:text-teal-700 font-semibold">
                Login here
              </Link>
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Register;
