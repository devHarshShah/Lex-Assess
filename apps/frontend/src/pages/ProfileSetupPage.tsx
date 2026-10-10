import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Pencil, FileCheck2, CheckCircle2, User, GraduationCap, Briefcase, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ProfileStepper } from '@/components/profile-stepper'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
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
  internshipGoals: ['Law Firms', 'Advocates', 'Corporate Houses', 'NGOs', 'Judiciary', 'Government Bodies', 'Other'],
  internshipDurations: ['1 Month', '2 Months', '3 Months', '6 Months'],
}

const MAX_PROFILE_PHOTO_BYTES = 1 * 1024 * 1024
const MAX_RESUME_BYTES = 2 * 1024 * 1024

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function getInternshipPeriods(duration: string): string[] {
  const months = parseInt(duration, 10)
  if (!months || months < 1 || months > 12 || 12 % months !== 0) return []
  const periods: string[] = []
  for (let start = 0; start < 12; start += months) {
    const end = start + months - 1
    const startName = MONTH_NAMES[start]!
    const endName = MONTH_NAMES[end]!
    periods.push(months === 1 ? startName : `${startName}-${endName}`)
  }
  return periods
}

function validateFileSize(file: File, maxBytes: number, label: string): boolean {
  if (file.size > maxBytes) {
    const maxMb = (maxBytes / (1024 * 1024)).toFixed(0)
    toast.error(`${label} must be ${maxMb} MB or smaller.`)
    return false
  }
  return true
}

function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
    </div>
  )
}

function getStepOneMissingMessage(input: {
  fullName: string
  college: string
  manualCollege: string
  degree: string
  currentYear: string
  specialization: string
  gender: 'MALE' | 'FEMALE' | 'OTHER'
  countryCode: string
  mobileNumber: string
  internshipGoal: string
  internshipDuration: string
  internshipPeriod: string
}) {
  if (!input.fullName.trim()) return 'Please enter your full name'
  if (!input.college.trim()) return 'Please select your college'
  if (input.college === 'Other' && !input.manualCollege.trim()) return 'Please enter your institute name'
  if (!input.degree.trim()) return 'Please select your degree'
  if (!input.currentYear.trim()) return 'Please select your current year'
  if (!input.specialization.trim()) return 'Please select your practice area'
  if (!input.internshipGoal.trim()) return 'Please select your internship goal'
  if (!input.internshipDuration.trim()) return 'Please select your internship duration'
  if (!input.internshipPeriod.trim()) return 'Please select your internship period'
  if (!input.gender.trim()) return 'Please select your gender'
  if (!input.countryCode.trim() || !input.mobileNumber.trim()) return 'Please enter your phone number'
  return null
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
  const [internshipGoal, setInternshipGoal] = React.useState('')
  const [internshipDuration, setInternshipDuration] = React.useState('')
  const [internshipPeriod, setInternshipPeriod] = React.useState('')

  const isPracticeAreaLocked = currentYear === '1' || currentYear === '2' || currentYear === '3'

  // Sync specialization to "General" if locked
  React.useEffect(() => {
    if (isPracticeAreaLocked) {
      setSpecialization('General')
    }
  }, [isPracticeAreaLocked])

  // Reset period if it's no longer valid for the selected duration
  React.useEffect(() => {
    const validPeriods = getInternshipPeriods(internshipDuration)
    if (internshipPeriod && !validPeriods.includes(internshipPeriod)) {
      setInternshipPeriod('')
    }
  }, [internshipDuration, internshipPeriod])

  const [gender, setGender] = React.useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE')
  const [countryCode, setCountryCode] = React.useState('+91')
  const [mobileNumber, setMobileNumber] = React.useState('')
  const [linkedinUrl, setLinkedinUrl] = React.useState('')
  // `*Url` holds a presigned URL for preview/display; `*Key` holds the canonical
  // object key set only on a fresh upload (what we persist). On submit we send
  // the key when a new upload happened, else fall back to the loaded URL.
  const [resumeUrl, setResumeUrl] = React.useState('')
  const [resumeKey, setResumeKey] = React.useState('')
  const [profilePhotoUrl, setProfilePhotoUrl] = React.useState(user.avatarUrl ?? '')
  const [profilePhotoKey, setProfilePhotoKey] = React.useState('')
  const [verificationType, setVerificationType] = React.useState<VerificationType>('ONGOING')
  const [verificationDocUrl, setVerificationDocUrl] = React.useState('')
  const [verificationDocKey, setVerificationDocKey] = React.useState('')
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false)
  const [uploadingResume, setUploadingResume] = React.useState(false)
  const [uploadingVerificationDoc, setUploadingVerificationDoc] = React.useState(false)

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
        setInternshipGoal(profile.internshipGoal || '')
        setInternshipDuration(profile.internshipDuration || '')
        setInternshipPeriod(profile.internshipPeriod || '')
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
    } finally {
      setLoading(false)
    }
  }

  void init()
  }, [user.avatarUrl, user.name])

  if (loading || !options) {
    // Mirrors the real layout's width/spacing (see the return below) and the
    // actual form's shape - photo + two-column field grid - so the page
    // doesn't jump or resize once the real content swaps in, and the wait
    // reads as "your profile is arriving" rather than a generic spinner.
    return (
      <div className={isSetup ? 'w-full max-w-6xl mx-auto flex-1 flex flex-col justify-center py-6 px-4' : 'w-full max-w-4xl mx-auto flex-1 flex flex-col justify-center py-2'}>
        <div className="w-full space-y-6">
          <div className={isSetup ? 'grid gap-6 md:grid-cols-[1.2fr_0.8fr]' : 'block'}>
            <Card className={`border-border/70 shadow-sm ${isManage ? 'bg-card' : ''}`}>
              {isManage ? (
                <div className="p-5 pb-3 space-y-2">
                  <Skeleton className="h-6 w-28" />
                  <Skeleton className="h-3.5 w-56" />
                </div>
              ) : (
                <CardHeader className="space-y-3">
                  <Skeleton className="h-7 w-64" />
                  <Skeleton className="h-3.5 w-72" />
                </CardHeader>
              )}

              <CardContent className={`space-y-5 ${isManage ? 'p-5' : ''}`}>
                <div className="flex items-center gap-4 pb-5 border-b">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>

                {/* Mirrors the three grouped sections (personal / academic /
                    internship) in the real form below. */}
                {[4, 4, 3].map((fieldCount, section) => (
                  <div key={section} className="space-y-4 rounded-xl border bg-muted/20 p-4">
                    <div className="flex items-center gap-2.5">
                      <Skeleton className="h-7 w-7 shrink-0 rounded-lg" />
                      <Skeleton className="h-3.5 w-32" />
                    </div>
                    <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                      {Array.from({ length: fieldCount }).map((_, i) => (
                        <div key={i} className="space-y-2">
                          <Skeleton className="h-3.5 w-24" />
                          <Skeleton className="h-10 w-full rounded-md" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <Skeleton className="h-10 w-full rounded-md sm:w-40" />
              </CardContent>
            </Card>

            {isSetup ? <Skeleton className="hidden md:block rounded-xl min-h-[420px]" /> : null}
          </div>
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
  const step1MissingMessage = getStepOneMissingMessage({
    fullName,
    college,
    manualCollege,
    degree,
    currentYear,
    specialization,
    gender,
    countryCode,
    mobileNumber,
    internshipGoal,
    internshipDuration,
    internshipPeriod,
  })
  const isStep1Complete = step1MissingMessage === null
  const isStep2Complete = Boolean(verificationDocUrl)

  const handleSaveStep1 = async (proceed: boolean) => {
    if (step1MissingMessage) {
      toast.error(step1MissingMessage)
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
        // Persist the object key from a fresh upload; fall back to the loaded
        // URL (server resolves both via toObjectKey) so we never wipe the field.
        resumeUrl: resumeKey || resumeUrl || undefined,
        profilePhotoUrl: profilePhotoKey || profilePhotoUrl || undefined,
        internshipGoal,
        internshipDuration,
        internshipPeriod,
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
    if (step1MissingMessage) {
      toast.error(step1MissingMessage)
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
        resumeUrl: resumeKey || resumeUrl || undefined,
        profilePhotoUrl: profilePhotoKey || profilePhotoUrl || undefined,
        internshipGoal,
        internshipDuration,
        internshipPeriod,
      })
      if (verificationDocKey || verificationDocUrl) {
        await saveProfileVerification({
          verificationType,
          verificationDocUrl: verificationDocKey || verificationDocUrl,
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
      verificationDocUrl: verificationDocKey || verificationDocUrl,
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
      {isSetup ? <ProfileStepper currentStep={currentStep} step1Completed={isStep1Complete} step2Completed={isStep2Complete} /> : null}

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
                <div className="flex items-center gap-4 pb-5 border-b">
                  <div className="group relative shrink-0">
                    <Avatar className="h-16 w-16 border border-border shadow-sm">
                      {profilePhotoUrl ? <AvatarImage src={profilePhotoUrl} alt={fullName || user.name} /> : null}
                      <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">{initials || 'U'}</AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={() => profilePhotoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-110 disabled:opacity-70 disabled:hover:scale-100"
                      aria-label="Upload profile photo"
                    >
                      {uploadingPhoto ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pencil className="h-3 w-3" />}
                    </button>
                    <input
                      ref={profilePhotoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingPhoto}
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        if (!validateFileSize(file, MAX_PROFILE_PHOTO_BYTES, 'Profile photo')) {
                          e.target.value = ''
                          return
                        }
                        setUploadingPhoto(true)
                        try {
                          const upload = await uploadProfileAsset(file, 'profile_photo')
                          setProfilePhotoUrl(upload.url)
                          setProfilePhotoKey(upload.objectKey)
                          toast.success('Profile photo uploaded')
                        } catch {
                          toast.error('Could not upload profile photo')
                        } finally {
                          setUploadingPhoto(false)
                        }
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{fullName || user.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Tap the pencil to update your photo <span className="text-muted-foreground/70">(optional)</span></p>
                  </div>
                </div>

                {/* Personal details */}
                <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                  <SectionHeading icon={<User className="h-3.5 w-3.5" />} title="Personal details" />
                  <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Full name</Label>
                      <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>LinkedIn URL <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                      <Input
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        placeholder="https://linkedin.com/in/..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <div className="flex gap-2">
                        <Select value={countryCode} onValueChange={setCountryCode}>
                          <SelectTrigger className="w-[90px] shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="+91">+91</SelectItem>
                            <SelectItem value="+1">+1</SelectItem>
                            <SelectItem value="+44">+44</SelectItem>
                            <SelectItem value="+61">+61</SelectItem>
                            <SelectItem value="+971">+971</SelectItem>
                            <SelectItem value="+65">+65</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} placeholder="9876543210" className="flex-1" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <div className="grid grid-cols-3 h-10 items-center rounded-md border p-0.5 bg-background">
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
                      <Label>Resume <span className="text-muted-foreground font-normal">(Recommended)</span></Label>
                      <div className="flex items-center gap-4">
                        <Input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          disabled={uploadingResume}
                          className="cursor-pointer file:cursor-pointer flex-1 bg-background disabled:cursor-not-allowed disabled:opacity-70"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            if (!validateFileSize(file, MAX_RESUME_BYTES, 'Resume')) {
                              e.target.value = ''
                              return
                            }
                            setUploadingResume(true)
                            try {
                              const upload = await uploadProfileAsset(file, 'resume')
                              setResumeUrl(upload.url)
                              setResumeKey(upload.objectKey)
                              toast.success('Resume uploaded')
                            } catch {
                              toast.error('Could not upload resume')
                            } finally {
                              setUploadingResume(false)
                            }
                          }}
                        />
                        {uploadingResume && (
                          <div className="shrink-0 flex items-center gap-2 px-3 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading...
                          </div>
                        )}
                        {!uploadingResume && resumeUrl && (
                          <div className="shrink-0 flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-md text-sm font-medium">
                            <CheckCircle2 className="w-4 h-4" />
                            <a href={resumeUrl} target="_blank" rel="noreferrer" className="hover:underline">
                              View Uploaded
                            </a>
                          </div>
                        )}
                      </div>
                      {!uploadingResume && !resumeUrl && (
                        <p className="text-xs text-amber-700">
                          Your CV is part of your rank score. Profiles without a resume can't get a CV score, so we strongly
                          recommend adding one.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Academic details */}
                <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                  <SectionHeading icon={<GraduationCap className="h-3.5 w-3.5" />} title="Academic details" />
                  <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>College</Label>
                      <Select value={college} onValueChange={setCollege}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select college" />
                        </SelectTrigger>
                        <SelectContent side="bottom" avoidCollisions={false}>
                          {options.colleges.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {college === 'Other' && (
                      <div className="space-y-2">
                        <Label>Institute Name</Label>
                        <Input
                          value={manualCollege}
                          onChange={(e) => setManualCollege(e.target.value)}
                          placeholder="Enter your institute name"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Degree</Label>
                      <Select value={degree} onValueChange={setDegree}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select degree" />
                        </SelectTrigger>
                        <SelectContent>
                          {options.degrees.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Current Year</Label>
                      <Select value={currentYear} onValueChange={setCurrentYear}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {options.years.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Practice Area</Label>
                      <Select value={specialization} onValueChange={setSpecialization} disabled={isPracticeAreaLocked}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select practice area" />
                        </SelectTrigger>
                        <SelectContent>
                          {options.specializations.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isPracticeAreaLocked && (
                        <div className="mt-1.5 p-2 rounded-md bg-amber-50 border border-amber-200">
                          <p className="text-[11px] text-amber-700 leading-tight">
                            <strong>Note:</strong> Till 3rd year and below you can give general law paper only. Your practice area is locked to <strong>General</strong>.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Internship preferences */}
                <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                  <SectionHeading icon={<Briefcase className="h-3.5 w-3.5" />} title="Internship preferences" />
                  <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Internship Preference</Label>
                      <Select value={internshipGoal} onValueChange={setInternshipGoal}>
                        <SelectTrigger>
                          <SelectValue placeholder="Where do you want to intern?" />
                        </SelectTrigger>
                        <SelectContent>
                          {options.internshipGoals.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Internship Duration</Label>
                      <Select value={internshipDuration} onValueChange={setInternshipDuration}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          {options.internshipDurations.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Internship Period</Label>
                      <Select value={internshipPeriod} onValueChange={setInternshipPeriod} disabled={!internshipDuration}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                          {getInternshipPeriods(internshipDuration).map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                  {isSetup && currentStep === 1 && (
                    <div className="pt-4 flex justify-end">
                      <Button
                        className="px-8"
                        disabled={submitting || !isStep1Complete}
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

                  <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                    {!isManage && <SectionHeading icon={<FileText className="h-3.5 w-3.5" />} title="Verification document" />}
                    <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Verification Type</Label>
                        <Select value={verificationType} onValueChange={(v) => setVerificationType(v as VerificationType)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ONGOING">Ongoing Degree (College ID Card)</SelectItem>
                            <SelectItem value="GRADUATED">Graduated (Degree Certificate)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Verification Document</Label>
                        <div className="flex items-center gap-4">
                          <Input
                            type="file"
                            accept="image/*,.pdf"
                            disabled={uploadingVerificationDoc}
                            className="cursor-pointer file:cursor-pointer flex-1 bg-background disabled:cursor-not-allowed disabled:opacity-70"
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              if (!validateFileSize(file, MAX_RESUME_BYTES, 'Verification document')) {
                                e.target.value = ''
                                return
                              }
                              setUploadingVerificationDoc(true)
                              try {
                                const upload = await uploadProfileAsset(file, 'verification_doc')
                                setVerificationDocUrl(upload.url)
                                setVerificationDocKey(upload.objectKey)
                                toast.success('Verification document uploaded')
                              } catch {
                                toast.error('Could not upload verification document')
                              } finally {
                                setUploadingVerificationDoc(false)
                              }
                            }}
                          />
                          {uploadingVerificationDoc && (
                            <div className="shrink-0 flex items-center gap-2 px-3 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Uploading...
                            </div>
                          )}
                        </div>
                      </div>
                      {!uploadingVerificationDoc && verificationDocUrl && (
                        <div className="sm:col-span-2">
                          <div className="inline-flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-md text-sm text-primary">
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
