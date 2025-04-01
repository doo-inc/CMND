
import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  User,
  Bell,
  Lock,
  Users,
  FileText,
  Building,
  Mail,
  Settings as SettingsIcon,
  Globe,
  Save,
  Plus
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const SettingsPage = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        <Card className="glass-card animate-fade-in">
          <CardContent className="p-0">
            <Tabs defaultValue="profile" className="w-full">
              <div className="flex">
                <div className="w-64 border-r p-4">
                  <TabsList className="flex flex-col items-start space-y-1 bg-transparent p-0 w-full">
                    <TabsTrigger value="profile" className="w-full justify-start px-2 py-1.5 text-left data-[state=active]:bg-accent/50">
                      <User className="mr-2 h-4 w-4" />
                      My Profile
                    </TabsTrigger>
                    <TabsTrigger value="company" className="w-full justify-start px-2 py-1.5 text-left data-[state=active]:bg-accent/50">
                      <Building className="mr-2 h-4 w-4" />
                      Company
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="w-full justify-start px-2 py-1.5 text-left data-[state=active]:bg-accent/50">
                      <Bell className="mr-2 h-4 w-4" />
                      Notifications
                    </TabsTrigger>
                    <TabsTrigger value="security" className="w-full justify-start px-2 py-1.5 text-left data-[state=active]:bg-accent/50">
                      <Lock className="mr-2 h-4 w-4" />
                      Security
                    </TabsTrigger>
                    <TabsTrigger value="team" className="w-full justify-start px-2 py-1.5 text-left data-[state=active]:bg-accent/50">
                      <Users className="mr-2 h-4 w-4" />
                      Team
                    </TabsTrigger>
                    <TabsTrigger value="integrations" className="w-full justify-start px-2 py-1.5 text-left data-[state=active]:bg-accent/50">
                      <Globe className="mr-2 h-4 w-4" />
                      Integrations
                    </TabsTrigger>
                    <TabsTrigger value="preferences" className="w-full justify-start px-2 py-1.5 text-left data-[state=active]:bg-accent/50">
                      <SettingsIcon className="mr-2 h-4 w-4" />
                      Preferences
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <div className="flex-1 p-6">
                  <TabsContent value="profile" className="m-0 animate-slide-in">
                    <h2 className="text-xl font-semibold mb-4">My Profile</h2>
                    <div className="space-y-6">
                      <div className="flex items-center gap-6">
                        <Avatar className="h-20 w-20">
                          <AvatarImage src="" alt="Profile" />
                          <AvatarFallback className="text-2xl bg-doo-purple-500 text-white">AD</AvatarFallback>
                        </Avatar>
                        <div>
                          <Button variant="outline" className="glass-input mr-2">Change</Button>
                          <Button variant="outline" className="glass-input text-destructive">Remove</Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input id="firstName" defaultValue="Alex" className="glass-input" />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input id="lastName" defaultValue="Doe" className="glass-input" />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" type="email" defaultValue="alex.doe@doocommand.com" className="glass-input" />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone</Label>
                          <Input id="phone" type="tel" defaultValue="+1 (555) 123-4567" className="glass-input" />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea id="bio" rows={4} className="glass-input" defaultValue="Customer Success Manager at DOO Command, focused on making onboarding smooth and efficient for all customers." />
                      </div>
                      
                      <div className="pt-4 flex justify-end">
                        <Button className="glass-button">
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="company" className="m-0 animate-slide-in">
                    <h2 className="text-xl font-semibold mb-4">Company Settings</h2>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="companyName">Company Name</Label>
                          <Input id="companyName" defaultValue="DOO Command" className="glass-input" />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="industry">Industry</Label>
                          <Select defaultValue="technology">
                            <SelectTrigger className="glass-input">
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                            <SelectContent className="glass-card">
                              <SelectItem value="technology">Technology</SelectItem>
                              <SelectItem value="retail">Retail</SelectItem>
                              <SelectItem value="healthcare">Healthcare</SelectItem>
                              <SelectItem value="finance">Finance</SelectItem>
                              <SelectItem value="education">Education</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="website">Website</Label>
                          <Input id="website" type="url" defaultValue="https://doocommand.com" className="glass-input" />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="size">Company Size</Label>
                          <Select defaultValue="51-200">
                            <SelectTrigger className="glass-input">
                              <SelectValue placeholder="Select company size" />
                            </SelectTrigger>
                            <SelectContent className="glass-card">
                              <SelectItem value="1-10">1-10 employees</SelectItem>
                              <SelectItem value="11-50">11-50 employees</SelectItem>
                              <SelectItem value="51-200">51-200 employees</SelectItem>
                              <SelectItem value="201-500">201-500 employees</SelectItem>
                              <SelectItem value="501+">501+ employees</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea id="address" rows={3} className="glass-input" defaultValue="123 Tech Lane, Suite 400, San Francisco, CA 94107" />
                      </div>
                      
                      <div className="pt-4 flex justify-end">
                        <Button className="glass-button">
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="notifications" className="m-0 animate-slide-in">
                    <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="font-medium">Email Notifications</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="email-updates">Customer Updates</Label>
                              <p className="text-sm text-muted-foreground">Receive updates when customer status changes</p>
                            </div>
                            <Switch id="email-updates" defaultChecked />
                          </div>
                          
                          <Separator />
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="email-deadlines">Deadline Reminders</Label>
                              <p className="text-sm text-muted-foreground">Get notified before stage deadlines</p>
                            </div>
                            <Switch id="email-deadlines" defaultChecked />
                          </div>
                          
                          <Separator />
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="email-contracts">Contract Activity</Label>
                              <p className="text-sm text-muted-foreground">Updates on contract status, approvals, and renewals</p>
                            </div>
                            <Switch id="email-contracts" defaultChecked />
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h3 className="font-medium">System Notifications</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="browser-notifications">Browser Notifications</Label>
                              <p className="text-sm text-muted-foreground">Show desktop notifications in browser</p>
                            </div>
                            <Switch id="browser-notifications" />
                          </div>
                          
                          <Separator />
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="sound-notifications">Sound Alerts</Label>
                              <p className="text-sm text-muted-foreground">Play sound when new messages arrive</p>
                            </div>
                            <Switch id="sound-notifications" defaultChecked />
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-4 flex justify-end">
                        <Button className="glass-button">
                          <Save className="mr-2 h-4 w-4" />
                          Save Preferences
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="security" className="m-0 animate-slide-in">
                    <h2 className="text-xl font-semibold mb-4">Security Settings</h2>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <h3 className="font-medium">Change Password</h3>
                        <div className="grid grid-cols-1 gap-4 max-w-md">
                          <div className="space-y-2">
                            <Label htmlFor="current-password">Current Password</Label>
                            <Input id="current-password" type="password" className="glass-input" />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input id="new-password" type="password" className="glass-input" />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirm New Password</Label>
                            <Input id="confirm-password" type="password" className="glass-input" />
                          </div>
                          
                          <Button className="glass-button w-full mt-2">Update Password</Button>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-4">
                        <h3 className="font-medium">Two-Factor Authentication</h3>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm">Enable two-factor authentication for enhanced security</p>
                            <p className="text-sm text-muted-foreground">Protect your account with an additional security layer</p>
                          </div>
                          <Switch id="tfa" defaultChecked />
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-4">
                        <h3 className="font-medium">Session Management</h3>
                        <div className="glass-card p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="text-sm font-medium">Current Session</p>
                              <p className="text-xs text-muted-foreground">MacBook Pro • San Francisco, CA • Started 2 hours ago</p>
                            </div>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Active</span>
                          </div>
                          <Button variant="outline" className="glass-input text-destructive text-sm">Sign Out All Other Devices</Button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="team" className="m-0 animate-slide-in">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold">Team Members</h2>
                      <Button className="glass-button">
                        <Users className="mr-2 h-4 w-4" />
                        Invite Team Member
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Sample team members list */}
                      <div className="glass-card p-4 rounded-lg flex items-center justify-between">
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-doo-purple-400 text-white">JD</AvatarFallback>
                          </Avatar>
                          <div className="ml-4">
                            <p className="text-sm font-medium">Jane Doe</p>
                            <p className="text-xs text-muted-foreground">jane.doe@doocommand.com • Admin</p>
                          </div>
                        </div>
                        <Button variant="outline" className="glass-input">Manage</Button>
                      </div>
                      
                      <div className="glass-card p-4 rounded-lg flex items-center justify-between">
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-blue-400 text-white">MS</AvatarFallback>
                          </Avatar>
                          <div className="ml-4">
                            <p className="text-sm font-medium">Michael Smith</p>
                            <p className="text-xs text-muted-foreground">michael.smith@doocommand.com • Sales</p>
                          </div>
                        </div>
                        <Button variant="outline" className="glass-input">Manage</Button>
                      </div>
                      
                      <div className="glass-card p-4 rounded-lg flex items-center justify-between">
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-green-400 text-white">SC</AvatarFallback>
                          </Avatar>
                          <div className="ml-4">
                            <p className="text-sm font-medium">Sarah Chen</p>
                            <p className="text-xs text-muted-foreground">sarah.chen@doocommand.com • Customer Success</p>
                          </div>
                        </div>
                        <Button variant="outline" className="glass-input">Manage</Button>
                      </div>
                      
                      <div className="glass-card p-4 rounded-lg flex items-center justify-between">
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-amber-400 text-white">RJ</AvatarFallback>
                          </Avatar>
                          <div className="ml-4">
                            <p className="text-sm font-medium">Robert Johnson</p>
                            <p className="text-xs text-muted-foreground">robert.johnson@doocommand.com • Engineering</p>
                          </div>
                        </div>
                        <Button variant="outline" className="glass-input">Manage</Button>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="integrations" className="m-0 animate-slide-in">
                    <h2 className="text-xl font-semibold mb-4">API & Integrations</h2>
                    
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <h3 className="font-medium">API Keys</h3>
                        <p className="text-sm text-muted-foreground">Manage API keys for external integrations</p>
                        
                        <div className="glass-card p-4 rounded-lg mt-4">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="text-sm font-medium">Production API Key</p>
                              <p className="text-xs text-muted-foreground">Last used 2 days ago</p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" className="glass-input text-xs">View</Button>
                              <Button variant="outline" className="glass-input text-destructive text-xs">Revoke</Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">Development API Key</p>
                              <p className="text-xs text-muted-foreground">Last used 5 hours ago</p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" className="glass-input text-xs">View</Button>
                              <Button variant="outline" className="glass-input text-destructive text-xs">Revoke</Button>
                            </div>
                          </div>
                        </div>
                        
                        <Button className="glass-button mt-4">
                          <Plus className="mr-2 h-4 w-4" />
                          Generate New API Key
                        </Button>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <h3 className="font-medium">Connected Services</h3>
                        <p className="text-sm text-muted-foreground">Manage your connected third-party services</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div className="glass-card p-4 rounded-lg flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-full bg-[#ff5c35] flex items-center justify-center text-white font-bold">H</div>
                              <div className="ml-3">
                                <p className="text-sm font-medium">HubSpot</p>
                                <p className="text-xs text-muted-foreground">Connected • Syncing contacts and deals</p>
                              </div>
                            </div>
                            <Button variant="outline" className="glass-input">Configure</Button>
                          </div>
                          
                          <div className="glass-card p-4 rounded-lg flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-full bg-[#4285F4] flex items-center justify-center text-white font-bold">G</div>
                              <div className="ml-3">
                                <p className="text-sm font-medium">Google Calendar</p>
                                <p className="text-xs text-muted-foreground">Connected • Syncing events</p>
                              </div>
                            </div>
                            <Button variant="outline" className="glass-input">Configure</Button>
                          </div>
                          
                          <div className="glass-card p-4 rounded-lg flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center text-white font-bold">W</div>
                              <div className="ml-3">
                                <p className="text-sm font-medium">WhatsApp Business</p>
                                <p className="text-xs text-muted-foreground">Connected • API active</p>
                              </div>
                            </div>
                            <Button variant="outline" className="glass-input">Configure</Button>
                          </div>
                          
                          <div className="glass-card p-4 rounded-lg flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">+</div>
                              <div className="ml-3">
                                <p className="text-sm font-medium">Connect New Service</p>
                                <p className="text-xs text-muted-foreground">Add a new integration</p>
                              </div>
                            </div>
                            <Button variant="outline" className="glass-input">Browse</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="preferences" className="m-0 animate-slide-in">
                    <h2 className="text-xl font-semibold mb-4">App Preferences</h2>
                    
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="font-medium">Appearance</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="theme-preference">Theme</Label>
                              <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                            </div>
                            <Select defaultValue="system">
                              <SelectTrigger className="glass-input w-40">
                                <SelectValue placeholder="Select theme" />
                              </SelectTrigger>
                              <SelectContent className="glass-card">
                                <SelectItem value="light">Light</SelectItem>
                                <SelectItem value="dark">Dark</SelectItem>
                                <SelectItem value="system">System</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <Separator />
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="animations">Animations</Label>
                              <p className="text-sm text-muted-foreground">Enable UI animations</p>
                            </div>
                            <Switch id="animations" defaultChecked />
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h3 className="font-medium">Localization</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="language">Language</Label>
                              <p className="text-sm text-muted-foreground">Set your preferred language</p>
                            </div>
                            <Select defaultValue="en">
                              <SelectTrigger className="glass-input w-40">
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                              <SelectContent className="glass-card">
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="es">Spanish</SelectItem>
                                <SelectItem value="fr">French</SelectItem>
                                <SelectItem value="de">German</SelectItem>
                                <SelectItem value="ar">Arabic</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <Separator />
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="timezone">Timezone</Label>
                              <p className="text-sm text-muted-foreground">Set your timezone for dates and times</p>
                            </div>
                            <Select defaultValue="utc-8">
                              <SelectTrigger className="glass-input w-40">
                                <SelectValue placeholder="Select timezone" />
                              </SelectTrigger>
                              <SelectContent className="glass-card">
                                <SelectItem value="utc-8">Pacific Time (UTC-8)</SelectItem>
                                <SelectItem value="utc-5">Eastern Time (UTC-5)</SelectItem>
                                <SelectItem value="utc+0">UTC</SelectItem>
                                <SelectItem value="utc+1">Central European (UTC+1)</SelectItem>
                                <SelectItem value="utc+4">Gulf Time (UTC+4)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-4 flex justify-end">
                        <Button className="glass-button">
                          <Save className="mr-2 h-4 w-4" />
                          Save Preferences
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
