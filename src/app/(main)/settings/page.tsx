'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun, Monitor, User, Bell, Shield, Router, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { useCurrentUser, useUserPreferences, useUserActions, useRoutingPreferences, useRoutingActions } from '@/stores'
import { cn } from '@/lib/utils'
import {
  EditProfileDialog,
  ChangePasswordDialog,
  Enable2FADialog,
} from '@/components/settings'
import type { RequestIntent } from '@/lib/api/routing'
import type { AIProvider } from '@/types'

// Intent display names
const INTENT_LABELS: Record<RequestIntent, string> = {
  knowledge_query: 'Knowledge Queries',
  code_task: 'Code Tasks',
  data_analysis: 'Data Analysis',
  action_request: 'Actions',
  general_chat: 'General Chat',
}

// Provider display names
const PROVIDER_LABELS: Record<AIProvider, string> = {
  glean: 'Glean',
  anthropic: 'Claude (Anthropic)',
  openai: 'GPT (OpenAI)',
  dust: 'Dust',
  ondobot: 'OndoBot',
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const user = useCurrentUser()
  const preferences = useUserPreferences()
  const { updatePreferences } = useUserActions()
  const routingPrefs = useRoutingPreferences()
  const routingActions = useRoutingActions()

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>Your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback>
                  {user?.name.split(' ').map((n) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <EditProfileDialog
                trigger={
                  <Button variant="outline" className="ml-auto">
                    Edit Profile
                  </Button>
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>Customize how the app looks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-3 block">Theme</label>
              <div className="flex gap-2">
                {[
                  { value: 'light', label: 'Light', icon: Sun },
                  { value: 'dark', label: 'Dark', icon: Moon },
                  { value: 'system', label: 'System', icon: Monitor },
                ].map((option) => (
                  <Button
                    key={option.value}
                    variant={theme === option.value ? 'default' : 'outline'}
                    className={cn('flex-1')}
                    onClick={() => setTheme(option.value)}
                  >
                    <option.icon className="h-4 w-4 mr-2" />
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chat Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Chat Preferences
            </CardTitle>
            <CardDescription>Configure chat behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Send with Enter</p>
                <p className="text-sm text-muted-foreground">
                  Press Enter to send messages (Shift+Enter for new line)
                </p>
              </div>
              <Switch
                checked={preferences.sendWithEnter}
                onCheckedChange={(checked) =>
                  updatePreferences({ sendWithEnter: checked })
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Show line numbers in code</p>
                <p className="text-sm text-muted-foreground">
                  Display line numbers in code blocks
                </p>
              </div>
              <Switch
                checked={preferences.showCodeLineNumbers}
                onCheckedChange={(checked) =>
                  updatePreferences({ showCodeLineNumbers: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Intelligent Routing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Router className="h-5 w-5" />
              Intelligent Routing
            </CardTitle>
            <CardDescription>
              Automatically route requests to the best AI provider based on intent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enable Auto-Routing</p>
                <p className="text-sm text-muted-foreground">
                  Automatically select the best provider for each request
                </p>
              </div>
              <Switch
                checked={routingPrefs.autoRouting}
                onCheckedChange={routingActions.setAutoRouting}
              />
            </div>

            {routingPrefs.autoRouting && (
              <>
                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Show Routing Indicator</p>
                    <p className="text-sm text-muted-foreground">
                      Display which provider handled each request
                    </p>
                  </div>
                  <Switch
                    checked={routingPrefs.showRoutingIndicator}
                    onCheckedChange={routingActions.setShowRoutingIndicator}
                  />
                </div>

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium">Confidence Threshold</p>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(routingPrefs.confidenceThreshold * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[routingPrefs.confidenceThreshold * 100]}
                    onValueChange={([value]) =>
                      routingActions.setConfidenceThreshold(value / 100)
                    }
                    min={50}
                    max={95}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Minimum confidence required for auto-routing. Lower values route more aggressively.
                  </p>
                </div>

                <Separator />

                <div>
                  <p className="font-medium mb-3">Provider Preferences</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Choose which provider handles each type of request
                  </p>
                  <div className="space-y-3">
                    {(Object.keys(INTENT_LABELS) as RequestIntent[]).map((intent) => (
                      <div key={intent} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{INTENT_LABELS[intent]}</span>
                        </div>
                        <Select
                          value={routingPrefs.providerPreferences[intent]}
                          onValueChange={(value) =>
                            routingActions.setProviderPreference(intent, value as AIProvider)
                          }
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(PROVIDER_LABELS) as AIProvider[]).map((provider) => (
                              <SelectItem key={provider} value={provider}>
                                {PROVIDER_LABELS[provider]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="flex justify-end">
                  <Button variant="outline" onClick={routingActions.resetToDefaults}>
                    Reset to Defaults
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>Manage your account security</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Change Password</p>
                <p className="text-sm text-muted-foreground">
                  Update your account password
                </p>
              </div>
              <ChangePasswordDialog
                trigger={<Button variant="outline">Change</Button>}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security
                </p>
              </div>
              <Enable2FADialog
                trigger={<Button variant="outline">Enable</Button>}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
