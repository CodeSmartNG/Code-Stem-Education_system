// src/utils/firebase.js

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
// ✅ ADD STORAGE IMPORTS
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  uploadBytesResumable,
  getDownloadURL, 
  deleteObject,
  listAll
} from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCQ_sNo4XG16JS7waJ_TEkCrK8sc1A4gq0",
  authDomain: "stem-education-9c439.firebaseapp.com",
  projectId: "stem-education-9c439",
  storageBucket: "stem-education-9c439.firebasestorage.app",
  messagingSenderId: "562966005597",
  appId: "1:562966005597:web:7757e059521a5cb8dc4ab4",
  measurementId: "G-QJDV0V79YD"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// ✅ Initialize Storage
const storage = getStorage(app);

// ========================================
// AUTH FUNCTIONS
// ========================================

export const registerUser = async (email, password, userData) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await sendEmailVerification(user);

    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: email,
      name: userData.name || '',
      role: userData.role || 'student',
      level: userData.level || 'Beginner',
      createdAt: new Date().toISOString(),
      isEmailVerified: false,
      isApproved: userData.role === 'teacher' ? false : true,
      purchasedLessons: [],
      completedLessons: {},
      progress: {},
      ...userData
    });

    return { user, userData };
  } catch (error) {
    console.error('❌ Error registering user:', error);
    throw error;
  }
};

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Check if email is verified
    if (!user.emailVerified) {
      // Check if this is a demo account (we can skip verification for demo)
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};

      // Allow demo accounts to bypass email verification
      if (userData.isDemoAccount) {
        // Auto-verify demo accounts
        return { ...user, ...userData, emailVerified: true };
      }

      throw new Error('Please verify your email before logging in.');
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};

    return { ...user, ...userData };
  } catch (error) {
    console.error('❌ Error logging in:', error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    console.log('✅ User logged out');
  } catch (error) {
    console.error('❌ Error logging out:', error);
    throw error;
  }
};

export const resendVerification = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      await sendEmailVerification(user);
      console.log('✅ Verification email resent');
      return { success: true };
    } else {
      throw new Error('No user is currently signed in');
    }
  } catch (error) {
    console.error('❌ Error resending verification:', error);
    throw error;
  }
};

export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    console.log('✅ Password reset email sent');
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending password reset:', error);
    throw error;
  }
};

export const getCurrentUser = () => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

// ========================================
// FIRESTORE CRUD FUNCTIONS
// ========================================

export const getUserData = async (uid) => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.error('❌ Error getting user data:', error);
    throw error;
  }
};

export const updateUserData = async (uid, data) => {
  try {
    await updateDoc(doc(db, 'users', uid), {
      ...data,
      updatedAt: new Date().toISOString()
    });
    console.log('✅ User data updated:', uid);
  } catch (error) {
    console.error('❌ Error updating user data:', error);
    throw error;
  }
};

export const deleteUserData = async (uid) => {
  try {
    await deleteDoc(doc(db, 'users', uid));
    console.log('✅ User data deleted:', uid);
  } catch (error) {
    console.error('❌ Error deleting user data:', error);
    throw error;
  }
};

export const saveCourse = async (courseData) => {
  try {
    const docRef = doc(collection(db, 'courses'));
    await setDoc(docRef, {
      ...courseData,
      id: docRef.id,
      createdAt: new Date().toISOString()
    });
    console.log('✅ Course saved:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error saving course:', error);
    throw error;
  }
};

export const getCourses = async (teacherId = null) => {
  try {
    let q = collection(db, 'courses');
    if (teacherId) {
      q = query(q, where('teacherId', '==', teacherId));
    }
    const querySnapshot = await getDocs(q);
    const courses = [];
    querySnapshot.forEach(doc => {
      courses.push({ id: doc.id, ...doc.data() });
    });
    return courses;
  } catch (error) {
    console.error('❌ Error getting courses:', error);
    throw error;
  }
};

export const saveLesson = async (courseId, lessonData) => {
  try {
    const docRef = doc(collection(db, 'lessons'));
    await setDoc(docRef, {
      ...lessonData,
      id: docRef.id,
      courseId: courseId,
      createdAt: new Date().toISOString()
    });
    console.log('✅ Lesson saved:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error saving lesson:', error);
    throw error;
  }
};

export const getLessons = async (courseId) => {
  try {
    const q = query(collection(db, 'lessons'), where('courseId', '==', courseId));
    const querySnapshot = await getDocs(q);
    const lessons = [];
    querySnapshot.forEach(doc => {
      lessons.push({ id: doc.id, ...doc.data() });
    });
    return lessons;
  } catch (error) {
    console.error('❌ Error getting lessons:', error);
    throw error;
  }
};

export const saveProgress = async (studentId, courseId, progressData) => {
  try {
    const docRef = doc(db, 'progress', `${studentId}_${courseId}`);
    await setDoc(docRef, {
      studentId,
      courseId,
      ...progressData,
      updatedAt: new Date().toISOString()
    });
    console.log('✅ Progress saved for:', studentId);
  } catch (error) {
    console.error('❌ Error saving progress:', error);
    throw error;
  }
};

// ========================================
// ✅ FIREBASE STORAGE FUNCTIONS
// ========================================

// ✅ Upload file to Firebase Storage
export const uploadFile = async (file, path) => {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    console.log('📤 Uploading file to Firebase Storage:', path);
    console.log('📤 File size:', file.size, 'bytes');

    const storageRef = ref(storage, path);
    
    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    console.log('✅ File uploaded:', snapshot.metadata.fullPath);
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    console.log('✅ Download URL:', downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error('❌ Error uploading file:', error);
    throw error;
  }
};

// ✅ Upload file with progress tracking
export const uploadFileWithProgress = async (file, path, onProgress) => {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    console.log('📤 Uploading file with progress:', path);

    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Progress callback
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress(progress);
          }
          console.log('📤 Upload progress:', progress.toFixed(0) + '%');
        },
        (error) => {
          console.error('❌ Upload error:', error);
          reject(error);
        },
        async () => {
          // Success callback
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log('✅ Upload complete:', downloadURL);
          resolve(downloadURL);
        }
      );
    });
  } catch (error) {
    console.error('❌ Error uploading file with progress:', error);
    throw error;
  }
};

// ✅ Delete file from Firebase Storage
export const deleteFile = async (filePath) => {
  try {
    if (!filePath) {
      throw new Error('No file path provided');
    }

    const storageRef = ref(storage, filePath);
    await deleteObject(storageRef);
    console.log('✅ File deleted:', filePath);
    return true;
  } catch (error) {
    console.error('❌ Error deleting file:', error);
    throw error;
  }
};

// ✅ Get file download URL
export const getFileUrl = async (filePath) => {
  try {
    if (!filePath) {
      throw new Error('No file path provided');
    }

    const storageRef = ref(storage, filePath);
    const downloadURL = await getDownloadURL(storageRef);
    console.log('✅ Got download URL:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('❌ Error getting file URL:', error);
    throw error;
  }
};

// ✅ List all files in a folder
export const listFiles = async (folderPath) => {
  try {
    if (!folderPath) {
      throw new Error('No folder path provided');
    }

    const listRef = ref(storage, folderPath);
    const result = await listAll(listRef);
    
    const files = [];
    result.items.forEach((itemRef) => {
      files.push(itemRef.name);
    });
    
    console.log('✅ Files in folder:', files);
    return files;
  } catch (error) {
    console.error('❌ Error listing files:', error);
    throw error;
  }
};

// ========================================
// DEFAULT USER CREATION
// ========================================

export const createDefaultUsers = async () => {
  try {
    console.log('🔄 Creating/updating default users...');

    // Default accounts
    const defaultUsers = [
      {
        email: 'codesmartng1@gmail.com',
        password: 'Kb1217@#$%&',
        name: 'Admin User',
        role: 'admin',
        isDemoAccount: true,
        isEmailVerified: true,
        isApproved: true
      },
      {
        email: 'kabiralkasim6@gmail.com',
        password: 'Kb1217@#$%&',
        name: 'Teacher User',
        role: 'teacher',
        isDemoAccount: true,
        isEmailVerified: true,
        isApproved: true,
        specialization: 'Web Development',
        bio: 'Experienced web developer and educator with 5+ years of teaching experience.',
        whatsappNumber: '2348012345678'
      },
      {
        email: 'kabiralkasim9@gmail.com',
        password: 'Kb1217@#$%&',
        name: 'Student User',
        role: 'student',
        isDemoAccount: true,
        isEmailVerified: true,
        level: 'Intermediate'
      }
    ];

    const results = [];
    for (const userData of defaultUsers) {
      try {
        let user = null;
        let isExisting = false;

        try {
          // Try to create new user
          const userCredential = await createUserWithEmailAndPassword(
            auth, 
            userData.email, 
            userData.password
          );
          user = userCredential.user;
          console.log(`✅ Created new ${userData.role}: ${userData.email}`);
        } catch (error) {
          if (error.code === 'auth/email-already-in-use') {
            console.log(`ℹ️ ${userData.email} already exists, updating...`);
            isExisting = true;

            // Sign in to get the user's UID
            try {
              const userCredential = await signInWithEmailAndPassword(
                auth, 
                userData.email, 
                userData.password
              );
              user = userCredential.user;
            } catch (signInError) {
              console.error(`❌ Error signing in ${userData.email}:`, signInError.message);
              // If can't sign in, we can't get the UID
              results.push({ 
                success: false, 
                email: userData.email, 
                error: 'Cannot sign in to update' 
              });
              continue;
            }
          } else {
            throw error;
          }
        }

        if (user) {
          // Save or update user data in Firestore
          const { password, ...userDataWithoutPassword } = userData;
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: userData.email,
            name: userData.name,
            role: userData.role,
            isDemoAccount: userData.isDemoAccount,
            isEmailVerified: userData.isEmailVerified,
            isApproved: userData.isApproved !== undefined ? userData.isApproved : true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...userDataWithoutPassword
          }, { merge: true }); // ✅ merge: true updates existing document

          console.log(`✅ ${isExisting ? 'Updated' : 'Created'} ${userData.role}: ${userData.email}`);
          results.push({ 
            success: true, 
            email: userData.email, 
            role: userData.role, 
            existing: isExisting 
          });
        }
      } catch (error) {
        console.error(`❌ Error processing ${userData.email}:`, error.message);
        results.push({ success: false, email: userData.email, error: error.message });
      }
    }

    console.log('✅ Default users creation complete');
    return results;
  } catch (error) {
    console.error('❌ Error creating default users:', error);
    return [];
  }
};

// ========================================
// EXPORT ALL
// ========================================

export { auth, db, storage };
export default {
  auth,
  db,
  storage,
  registerUser,
  loginUser,
  logoutUser,
  resendVerification,
  resetPassword,
  getCurrentUser,
  getUserData,
  updateUserData,
  deleteUserData,
  saveCourse,
  getCourses,
  saveLesson,
  getLessons,
  saveProgress,
  uploadFile,
  uploadFileWithProgress,
  deleteFile,
  getFileUrl,
  listFiles,
  createDefaultUsers
};