import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Pencil, FileCheck2, CheckCircle2, Scale } from 'lucide-react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ProfileStepper } from '@/components/profile-stepper'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  fetchCurrentUser,
  fetchMyProfile,
  fetchProfileOptions,
  saveProfileVerification,
  saveProfileStepOne,
  storeUser,
  uploadProfileAsset,
  type AuthUser,
  type ProfileOptions,
  type VerificationType,
} from '@/lib/auth'

const FALLBACK_PROFILE_OPTIONS: ProfileOptions = {
  colleges: [
    'National Law School of India University, Bengaluru',
    'National Law University, New Delhi',
    'NALSAR University of Law, Hyderabad',
    'The West Bengal National University of Juridical Sciences, Kolkata',
    'Symbiosis Law School, Pune',
  ],
  degrees: ['BA LLB', 'BBA LLB', 'BCom LLB', 'BSc LLB', 'LLB', 'LLM', 'BLS LLB', 'BA LLB (Hons.)', 'BBA LLB (Hons.)'],
  years: ['1', '2', '3', '4', '5', 'Graduate'],
  specializations: [
    'Capital Markets',
    'General Corporate',
    'Disputes',
    'Maritime and Aviation',
    'Intellectual Property Rights',
    'Taxation',
    'Banking and Finance',
    'Competition',
    'Labour',
    'Data Protection',
    'Technology',
  ],
}

const MAX_PROFILE_PHOTO_BYTES = 1 * 1024 * 1024
const MAX_RESUME_BYTES = 2 * 1024 * 1024

function validateFileSize(file: File, maxBytes: number, label: string): boolean {
  if (file.size > maxBytes) {
    const maxMb = (maxBytes / (1024 * 1024)).toFixed(0)
    toast.error(`${label} must be ${maxMb} MB or smaller.`)
    return false
  }
  return true
}

export function ProfileSetupPage({ user, mode = 'setup' }: { user: AuthUser; mode?: 'setup' | 'manage' }) {
  const navigate = useNavigate()
  const profilePhotoInputRef = React.useRef<HTMLInputElement | null>(null)
  const [options, setOptions] = React.useState<ProfileOptions | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const initializedRef = React.useRef(false)

  const isManage = mode === 'manage'
  const isSetup = mode === 'setup'

  const [currentStep, setCurrentStep] = React.useState<1 | 2>(1)

  const [fullName, setFullName] = React.useState('')
  const [college, setCollege] = React.useState('')
  const [manualCollege, setManualCollege] = React.useState('')
  const [degree, setDegree] = React.useState('')
  const [currentYear, setCurrentYear] = React.useState('')
  const [specialization, setSpecialization] = React.useState('')

  const isPracticeAreaLocked = currentYear === '1' || currentYear === '2' || currentYear === '3'

  // Sync specialization to "General" if locked
  React.useEffect(() => {
    if (isPracticeAreaLocked) {
      setSpecialization('General')
    }
  }, [isPracticeAreaLocked])

  const [gender, setGender] = React.useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE')
  const [countryCode, setCountryCode] = React.useState('+91')
  const [mobileNumber, setMobileNumber] = React.useState('')
  const [linkedinUrl, setLinkedinUrl] = React.useState('')
  const [resumeUrl, setResumeUrl] = React.useState('')
  const [profilePhotoUrl, setProfilePhotoUrl] = React.useState(user.avatarUrl ?? '')
  const [verificationType, setVerificationType] = React.useState<VerificationType>('ONGOING')
  const [verificationDocUrl, setVerificationDocUrl] = React.useState('')

  React.useEffect(() => {
  if (initializedRef.current) return
  initializedRef.current = true

  async function init() {
    try {
      const opt = await fetchProfileOptions()
      setOptions(opt)

      let profile = null
      try {
        profile = await fetchMyProfile()
      } catch {
        profile = null
      }

      if (profile) {
        setFullName(profile.fullName || user.name)

        if (profile.college && !opt.colleges.includes(profile.college)) {
          setCollege('Other')
          setManualCollege(profile.college)
        } else {
          setCollege(profile.college || '')
        }

        setDegree(profile.degree || '')
        setCurrentYear(profile.currentYear || '')
        setSpecialization(profile.specialization || '')
        setGender((profile.gender as 'MALE' | 'FEMALE' | 'OTHER' | null) ?? 'MALE')
        setCountryCode(profile.countryCode || '+91')
        setMobileNumber(profile.mobileNumber || '')
        setLinkedinUrl(profile.linkedinUrl || '')
        setResumeUrl(profile.resumeUrl || '')
        setProfilePhotoUrl(profile.profilePhotoUrl || user.avatarUrl || '')
        setVerificationType((profile.verificationType as VerificationType | null) ?? 'ONGOING')
        setVerificationDocUrl(profile.verificationDocUrl || '')
      } else {
        setFullName(user.name)
      }
    } catch {
      setOptions(FALLBACK_PROFILE_OPTIONS)
      toast.error('Using fallback profile options for now.')
    } finally {
      setLoading(false)
    }
  }

  void init()
  }, [user.avatarUrl, user.name])

  if (loading || !options) {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-background px-4">
      <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute -bottom-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md rounded-3xl border bg-card/90 p-8 text-center shadow-xl backdrop-blur">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <Scale className="size-6 text-primary" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">Setting Up Your Profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Fetching your preferences and academic options to personalize your experience.
        </p>

        <div className="mt-8 flex items-center justify-center gap-2">
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary [animation-delay:-0.2s]" />
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary [animation-delay:-0.1s]" />
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary" />
        </div>

        <p className="mt-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">Preparing Workspace</p>
      </div>
    </div>
  )
  }

  const initials = fullName
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((chunk) => chunk[0]?.toUpperCase() ?? '')
  .join('')

  const getCollegeToSave = () => (college === 'Other' ? manualCollege : college)

  const handleSaveStep1 = async (proceed: boolean) => {
    if (college === 'Other' && !manualCollege.trim()) {
      toast.error('Please enter your institute name')
      return false
    }
    setSubmitting(true)
    try {
      await saveProfileStepOne({
        fullName,
        college: getCollegeToSave(),
        degree,
        currentYear,
        specialization,
        gender,
        countryCode,
        mobileNumber,
        linkedinUrl: linkedinUrl || undefined,
        resumeUrl: resumeUrl || undefined,
        profilePhotoUrl: profilePhotoUrl || undefined,
      })
      storeUser({
        ...user,
        name: fullName,
        avatarUrl: profilePhotoUrl || user.avatarUrl,
      })
      if (proceed) {
        toast.success('Step 1 saved')
        setCurrentStep(2)
      }
      return true
    } catch {
      toast.error('Could not save profile details')
      return false
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveAll = async () => {
    if (college === 'Other' && !manualCollege.trim()) {
      toast.error('Please enter your institute name')
      return
    }
    setSubmitting(true)
    try {
      await saveProfileStepOne({
        fullName,
        college: getCollegeToSave(),
        degree,
        currentYear,
        specialization,
        gender,
        countryCode,
        mobileNumber,
        linkedinUrl: linkedinUrl || undefined,
        resumeUrl: resumeUrl || undefined,
        profilePhotoUrl: profilePhotoUrl || undefined,
      })
      if (verificationDocUrl) {
        await saveProfileVerification({
          verificationType,
          verificationDocUrl,
        })
      }
      storeUser({
        ...user,
        name: fullName,
        avatarUrl: profilePhotoUrl || user.avatarUrl,
      })
      toast.success('Profile updated successfully')
    } catch {
      toast.error('Could not save profile')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCompleteSetup = async () => {
  setSubmitting(true)
  try {
    await saveProfileVerification({
      verificationType,
      verificationDocUrl,
    })
    const refreshed = await fetchCurrentUser()
    storeUser(refreshed)
    toast.success('Profile completed')
    await navigate({ to: '/dashboard' })
  } catch {
    toast.error('Could not save verification')
  } finally {
    setSubmitting(false)
  }
  }

  return (
  <div className={isSetup ? "w-full max-w-6xl mx-auto flex-1 flex flex-col justify-center py-6 px-4" : "w-full max-w-4xl mx-auto flex-1 flex flex-col justify-center py-2"}>
    <div className="w-full space-y-6">
      {isSetup ? <ProfileStepper currentStep={currentStep} /> : null}

      <div className={isSetup ? "grid gap-6 md:grid-cols-[1.2fr_0.8fr]" : "block"}>

        <Card className={`border-border/70 shadow-sm ${isManage ? 'bg-card' : ''}`}>
          {isManage ? (
            <div className="p-5 pb-0">
              <h2 className="text-xl font-semibold tracking-tight">Profile</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Manage your personal and academic details.</p>
            </div>
          ) : (
            <CardHeader className="space-y-5">
              <div>
                <CardTitle className="text-2xl">
                  {currentStep === 1 ? 'Build Your Legal Profile' : 'Verification Step'}
                </CardTitle>
                <CardDescription>
                  {currentStep === 1 
                    ? 'Step 1 of 2: personal and academic details.' 
                    : 'Step 2 of 2: upload degree document if graduated, or college ID card if currently studying.'}
                </CardDescription>
              </div>
            </CardHeader>
          )}

          <CardContent className={`space-y-4 ${isManage ? 'p-5' : ''}`}>
            {(isManage || currentStep === 1) && (
              <div className="space-y-4">
                {/* Photo Section */}
                <div className="flex items-center gap-4 pb-3 border-b">
                  <div className="relative">
                    <Avatar className="h-14 w-14 border border-border shadow-sm">
                      {profilePhotoUrl ? <AvatarImage src={profilePhotoUrl} alt={fullName || user.name} /> : null}
                      <AvatarFallback className="text-lg font-semibold">{initials || 'U'}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Profile photo</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => profilePhotoInputRef.current?.click()}
                      className="gap-2"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Upload photo
                    </Button>
                    <input
                      ref={profilePhotoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        if (!validateFileSize(file, MAX_PROFILE_PHOTO_BYTES, 'Profile photo')) {
                          e.target.value = ''
                          return
                        }
                        try {
                          const upload = await uploadProfileAsset(file, 'profile_photo')
                          setProfilePhotoUrl(upload.url)
                          toast.success('Profile photo uploaded')
                        } catch {
                          toast.error('Could not upload profile photo')
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Form Grid */}
                <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Full name</label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">LinkedIn URL <span className="text-muted-foreground font-normal">(Optional)</span></label>
                    <Input
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">College</label>
                    <select className="h-10 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={college} onChange={(e) => setCollege(e.target.value)}>
                      <option value="">Select college</option>
                      {options.colleges.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  {college === 'Other' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Institute Name</label>
                      <Input
                        value={manualCollege}
                        onChange={(e) => setManualCollege(e.target.value)}
                        placeholder="Enter your institute name"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Degree</label>
                    <select className="h-10 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={degree} onChange={(e) => setDegree(e.target.value)}>
                      <option value="">Select degree</option>
                      {options.degrees.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Current Year</label>
                    <select
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={currentYear}
                      onChange={(e) => setCurrentYear(e.target.value)}
                    >
                      <option value="">Select year</option>
                      {options.years.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Practice Area</label>
                    <select
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:bg-muted disabled:opacity-70 disabled:cursor-not-allowed"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      disabled={isPracticeAreaLocked}
                    >
                      <option value="">Select practice area</option>
                      {options.specializations.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                    {isPracticeAreaLocked && (
                        <div className="mt-1.5 p-2 rounded-md bg-amber-50 border border-amber-200">
                          <p className="text-[11px] text-amber-700 leading-tight">
                            <strong>Note:</strong> Till 3rd year and below you can give general law paper only. Your practice area is locked to <strong>General</strong>.
                          </p>
                        </div>
                      )}
                  </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Phone <span className="text-muted-foreground font-normal">(Optional)</span></label>
                      <div className="flex gap-2">
                        <select
                          className="h-10 w-[90px] rounded-md border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                        >
                          <option value="+91">+91</option>
                          <option value="+1">+1</option>
                          <option value="+44">+44</option>
                          <option value="+61">+61</option>
                          <option value="+971">+971</option>
                          <option value="+65">+65</option>
                        </select>
                        <Input value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} placeholder="9876543210" className="flex-1" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Gender</label>
                      <div className="grid grid-cols-3 h-10 items-center rounded-md border p-0.5 bg-muted/20">
                        {(['MALE', 'FEMALE', 'OTHER'] as const).map((item) => (
                          <Button
                            key={item}
                            type="button"
                            size="sm"
                            variant={gender === item ? 'default' : 'ghost'}
                            onClick={() => setGender(item)}
                            className={`h-full ${gender === item ? 'shadow-sm' : ''}`}
                          >
                            {item === 'MALE' ? 'Male' : item === 'FEMALE' ? 'Female' : 'Other'}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-sm font-medium">Resume <span className="text-muted-foreground font-normal">(Optional)</span></label>
                      <div className="flex items-center gap-4">
                        <Input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          className="cursor-pointer file:cursor-pointer flex-1"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            if (!validateFileSize(file, MAX_RESUME_BYTES, 'Resume')) {
                              e.target.value = ''
                              return
                            }
                            try {
                              const upload = await uploadProfileAsset(file, 'resume')
                              setResumeUrl(upload.url)
                              toast.success('Resume uploaded')
                            } catch {
                              toast.error('Could not upload resume')
                            }
                          }}
                        />
                        {resumeUrl && (
                          <div className="shrink-0 flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-md text-sm font-medium">
                            <CheckCircle2 className="w-4 h-4" />
                            <a href={resumeUrl} target="_blank" rel="noreferrer" className="hover:underline">
                              View Uploaded
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {isSetup && currentStep === 1 && (
                    <div className="pt-4 flex justify-end">
                      <Button
                        className="px-8"
                        disabled={submitting}
                        onClick={() => handleSaveStep1(true)}
                      >
                        Continue to Verification
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {(isManage || currentStep === 2) && (
                <div className={`space-y-4 ${isManage ? 'pt-4 border-t' : ''}`}>
                  {isManage && (
                    <div>
                      <h3 className="text-base font-medium">Identity Verification</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Update your verification document to keep your status active.</p>
                    </div>
                  )}
                  
                  <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Verification Type</label>
                      <select
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={verificationType}
                        onChange={(e) => setVerificationType(e.target.value as VerificationType)}
                      >
                        <option value="ONGOING">Ongoing Degree (College ID Card)</option>
                        <option value="GRADUATED">Graduated (Degree Certificate)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Verification Document</label>
                      <div className="flex items-center gap-4">
                        <Input
                          type="file"
                          accept="image/*,.pdf"
                          className="cursor-pointer file:cursor-pointer flex-1"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            if (!validateFileSize(file, MAX_RESUME_BYTES, 'Verification document')) {
                              e.target.value = ''
                              return
                            }
                            try {
                              const upload = await uploadProfileAsset(file, 'verification_doc')
                              setVerificationDocUrl(upload.url)
                              toast.success('Verification document uploaded')
                            } catch {
                              toast.error('Could not upload verification document')
                            }
                          }}
                        />
                      </div>
                    </div>
                    {verificationDocUrl && (
                      <div className="sm:col-span-2">
                        <div className="inline-flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-md text-sm text-primary">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                          <span>
                            Document uploaded.{' '}
                            <a href={verificationDocUrl} target="_blank" rel="noreferrer" className="font-medium underline underline-offset-2 hover:text-primary/80">
                              View document
                            </a>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {isSetup && currentStep === 2 && (
                    <div className="pt-4 flex gap-3 justify-end">
                      <Button variant="outline" onClick={() => setCurrentStep(1)} disabled={submitting}>
                        Back
                      </Button>
                      <Button
                        className="px-8"
                        disabled={submitting || !verificationDocUrl}
                        onClick={handleCompleteSetup}
                      >
                        Complete Profile
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* SAVE BUTTON FOR MANAGE MODE */}
              {isManage && (
                <div className="flex justify-end pt-4 border-t mt-4">
                  <Button
                    size="default"
                    className="px-6"
                    disabled={submitting}
                    onClick={handleSaveAll}
                  >
                    Save changes
                  </Button>
                </div>
              )}

            </CardContent>
          </Card>

          {/* SETUP RIGHT SIDEBAR */}
          {isSetup && (
            <div className="h-fit sticky top-6">
              <Card className="border-border/70 bg-gradient-to-br from-background to-muted/40 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {currentStep === 1 ? 'Why this matters' : 'Final Review'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                  {currentStep === 1 ? (
                    <>
                      <p>Your profile powers ranking visibility and firm matching quality.</p>
                      <p>LexAssess uses verified education context to keep comparisons fair.</p>
                      <p>Step 2 will ask for proof of graduation or current enrollment.</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-3">
                        <FileCheck2 className="mt-1 h-4 w-4 text-primary shrink-0" />
                        <p>Upload a clear degree certificate if graduated, or a current college ID card if ongoing.</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-1 h-4 w-4 text-primary shrink-0" />
                        <p>Once this step is complete, your dashboard access is unlocked and your profile is marked verified.</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
