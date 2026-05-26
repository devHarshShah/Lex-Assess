import { createRoute } from '@tanstack/react-router'
import { rootRoute } from './root'
import { TestAttemptPage } from '../pages/TestAttemptPage'

export const dashboardTestAttemptRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard/test-attempt/$versionId',
  component: TestAttemptPage,
  errorComponent: ({ error }) => {
    console.error('CRITICAL ROUTE ERROR:', error)
    return (
      <div style={{ padding: '50px', backgroundColor: '#fee2e2', color: '#991b1b', minHeight: '100vh', fontFamily: 'sans-serif' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Test Route Crash</h1>
        <p style={{ marginTop: '10px' }}>The test page failed to load due to a runtime error.</p>
        <pre style={{ marginTop: '20px', padding: '15px', backgroundColor: 'white', border: '1px solid #f87171', borderRadius: '8px', overflow: 'auto' }}>
          {error?.message || 'Unknown Error'}
          {"\n\nStack:\n"}
          {error?.stack || 'No stack trace available'}
        </pre>
        <button 
          onClick={() => window.location.reload()} 
          style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Reload Page
        </button>
      </div>
    )
  }
})
