// src/components/StudentProfile.jsx

import React, { useState, useEffect } from 'react';
import './StudentProfile.css';
import { 
  getCurrentUser, 
  updateStudent,           // ← Changed from updateUserData
  getTeacherWhatsAppUrl, 
  getTeacherWhatsAppNumber 
} from '../utils/storageAPI';   // ← Changed from '../utils/storage'

const StudentProfile = ({ student, setStudent }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [teacherContacts, setTeacherContacts] = useState([]);

  // Initialize formData when student changes
  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name || '',
        email: student.email || '',
        level: student.level || 'Beginner',
        bio: student.bio || '',
        specialization: student.specialization || '',
        phone: student.phone || '',
        location: student.location || '',
        whatsappNumber: student.whatsappNumber || ''
      });
      loadStudentData();
    }
  }, [student]);

  const loadStudentData = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        if (currentUser.enrolledCourses) {
          setEnrolledCourses(currentUser.enrolledCourses);
        }
        if (currentUser.completedLessons) {
          setCompletedLessons(currentUser.completedLessons);
        }
        if (currentUser.teacherContacts) {
          const contacts = await Promise.all(
            currentUser.teacherContacts.map(async (teacherId) => {
              const number = await getTeacherWhatsAppNumber(teacherId);
              return {
                teacherId,
                whatsappNumber: number,
                url: getTeacherWhatsAppUrl(teacherId)
              };
            })
          );
          setTeacherContacts(contacts);
        }
      }
    } catch (error) {
      console.error('Error loading student data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        setMessage('❌ Please log in to update profile');
        setLoading(false);
        return;
      }

      const updatedData = {
        ...student,
        name: formData.name,
        email: formData.email,
        level: formData.level,
        bio: formData.bio || '',
        specialization: formData.specialization || '',
        phone: formData.phone || '',
        location: formData.location || '',
        whatsappNumber: formData.whatsappNumber || '',
        updatedAt: new Date().toISOString()
      };

      // ✅ Update via custom backend (uses `id`, not `uid`)
      await updateStudent(updatedData);

      setStudent({
        ...student,
        ...updatedData
      });

      setMessage('✅ Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('❌ Error updating profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!student) {
    return (
      <div className="student-profile">
        <h2>👤 Student Profile</h2>
        <div className="loading-state">Loading profile...</div>
      </div>
    );
  }

  const progress = student.progress || {};

  return (
    <div className="student-profile">
      <div className="profile-header">
        <div className="profile-avatar">
          {student.name?.charAt(0).toUpperCase() || 'S'}
        </div>
        <div className="profile-title">
          <h2>Student Profile</h2>
          <p className="profile-subtitle">Manage your account and learning progress</p>
        </div>
      </div>

      {message && (
        <div className={`profile-message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
          <button className="message-close" onClick={() => setMessage('')}>×</button>
        </div>
      )}

      {!isEditing ? (
        <div className="profile-view">
          <div className="profile-info-grid">
            <div className="info-card">
              <h3>📋 Personal Information</h3>
              <div className="info-item">
                <span className="label">Full Name:</span>
                <span className="value">{student.name}</span>
              </div>
              <div className="info-item">
                <span className="label">Email:</span>
                <span className="value">{student.email}</span>
              </div>
              <div className="info-item">
                <span className="label">Level:</span>
                <span className="value badge">{student.level}</span>
              </div>
              {student.bio && (
                <div className="info-item">
                  <span className="label">Bio:</span>
                  <span className="value">{student.bio}</span>
                </div>
              )}
              {student.specialization && (
                <div className="info-item">
                  <span className="label">Specialization:</span>
                  <span className="value">{student.specialization}</span>
                </div>
              )}
              {student.phone && (
                <div className="info-item">
                  <span className="label">Phone:</span>
                  <span className="value">{student.phone}</span>
                </div>
              )}
              {student.location && (
                <div className="info-item">
                  <span className="label">Location:</span>
                  <span className="value">{student.location}</span>
                </div>
              )}
              {student.whatsappNumber && (
                <div className="info-item">
                  <span className="label">WhatsApp:</span>
                  <span className="value">
                    <a 
                      href={`https://wa.me/${student.whatsappNumber}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      💬 {student.whatsappNumber}
                    </a>
                  </span>
                </div>
              )}
            </div>

            <div className="stats-card">
              <h3>📊 Learning Statistics</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-number">{enrolledCourses.length}</span>
                  <span className="stat-label">Enrolled Courses</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{completedLessons.length}</span>
                  <span className="stat-label">Completed Lessons</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{student.points || 0}</span>
                  <span className="stat-label">Points Earned</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{student.streak || 0}</span>
                  <span className="stat-label">Day Streak</span>
                </div>
              </div>
            </div>

            {teacherContacts.length > 0 && (
              <div className="contacts-card">
                <h3>📱 Teacher Contacts</h3>
                <div className="contacts-list">
                  {teacherContacts.map((contact, index) => (
                    <div key={index} className="contact-item">
                      <span className="contact-name">Teacher {index + 1}</span>
                      {contact.whatsappNumber && (
                        <a 
                          href={contact.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="contact-whatsapp"
                        >
                          💬 WhatsApp
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="progress-section">
            <h3>📈 Course Progress</h3>
            <div className="progress-list">
              {Object.entries(progress).length > 0 ? (
                Object.entries(progress).map(([course, value]) => (
                  <div key={course} className="progress-item">
                    <div className="progress-label">
                      <span className="course-name">
                        {course.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className="progress-percentage">{value || 0}%</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${value || 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-progress">No courses in progress yet. Start learning!</p>
              )}
            </div>
          </div>

          <button onClick={() => setIsEditing(true)} className="edit-profile-btn">
            ✏️ Edit Profile
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="profile-form">
          <h3>✏️ Edit Profile</h3>

          <div className="form-grid">
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
                required
                placeholder="Enter your full name"
              />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={handleChange}
                required
                placeholder="Enter your email"
              />
            </div>

            <div className="form-group">
              <label>Level</label>
              <select
                name="level"
                value={formData.level || 'Beginner'}
                onChange={handleChange}
              >
                <option value="Beginner">🌱 Beginner</option>
                <option value="Intermediate">📚 Intermediate</option>
                <option value="Advanced">🚀 Advanced</option>
              </select>
            </div>

            <div className="form-group">
              <label>Specialization</label>
              <input
                type="text"
                name="specialization"
                value={formData.specialization || ''}
                onChange={handleChange}
                placeholder="e.g., Web Development, Data Science"
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone || ''}
                onChange={handleChange}
                placeholder="Enter your phone number"
              />
            </div>

            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                name="location"
                value={formData.location || ''}
                onChange={handleChange}
                placeholder="Enter your location"
              />
            </div>

            <div className="form-group">
              <label>WhatsApp Number</label>
              <input
                type="tel"
                name="whatsappNumber"
                value={formData.whatsappNumber || ''}
                onChange={handleChange}
                placeholder="e.g., 2348012345678"
              />
              <small className="help-text">Include country code without + sign</small>
            </div>

            <div className="form-group full-width">
              <label>Bio</label>
              <textarea
                name="bio"
                value={formData.bio || ''}
                onChange={handleChange}
                rows="3"
                placeholder="Tell us about yourself, your interests, and goals"
              />
            </div>
          </div>

          <div className="form-buttons">
            <button type="submit" className="save-btn" disabled={loading}>
              {loading ? '💾 Saving...' : '💾 Save Changes'}
            </button>
            <button 
              type="button" 
              onClick={() => setIsEditing(false)} 
              className="cancel-btn"
              disabled={loading}
            >
              ❌ Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default StudentProfile;
