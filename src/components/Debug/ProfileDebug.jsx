import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import './ProfileDebug.css'

function ProfileDebug() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  const checkProfiles = async () => {
    setLoading(true)
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)

    // Get all profiles
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
    
    console.log('All profiles:', data, error)
    setProfiles(data || [])
    setLoading(false)
  }

  return (
    <div className="debug-container">
      <h2>Profile Debug Tool</h2>
      <button onClick={checkProfiles} disabled={loading}>
        {loading ? 'Loading...' : 'Check Profiles Table'}
      </button>

      {currentUser && (
        <div className="debug-section">
          <h3>Current User</h3>
          <pre>{JSON.stringify(currentUser, null, 2)}</pre>
        </div>
      )}

      {profiles.length > 0 && (
        <div className="debug-section">
          <h3>All Profiles in Database ({profiles.length})</h3>
          {profiles.map(profile => (
            <div key={profile.id} className="profile-item">
              <strong>ID:</strong> {profile.id}<br />
              <strong>Username:</strong> {profile.username || 'NULL'}<br />
              <strong>Created:</strong> {profile.created_at}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProfileDebug
