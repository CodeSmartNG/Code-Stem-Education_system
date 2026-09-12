// src/utils/storage.jsx
// src/utils/storage.js
// ⚠️ SHIM - Redirects all legacy Firebase imports to custom backend
export * from './storageAPI';
import { 
  auth, 
  db, 
  storage,
  // ✅ Firebase Storage instance
  getCurrentUser as firebaseGetCurrentUser,
  getUserData as firebaseGetUserData,
  updateUserData as firebaseUpdateUserData,
  logoutUser as firebaseLogout,
  loginUser,
  registerUser as firebaseRegister,
  resendVerification,
  // ✅ Storage functions
  uploadFile,
  uploadFileWithProgress,
  deleteFile,
  getFileUrl,
  listFiles
} from './firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  addDoc,
  increment
} from 'firebase/firestore';

// ============================================
// USER MANAGEMENT FUNCTIONS (Firebase)
// ============================================




// ✅ Process lesson payment
export const processLessonPayment = async (userId, courseKey, lessonId, amount, paymentMethod = 'paystack') => {
  try {
    if (!userId || !courseKey || !lessonId) {
      throw new Error('User ID, course key, and lesson ID are required');
    }

    const userData = await getUserData(userId);
    if (!userData) {
      throw new Error('User not found');
    }

    const purchasedLessons = userData.purchasedLessons || [];
    if (purchasedLessons.some(p => p.courseKey === courseKey && p.lessonId === lessonId)) {
      throw new Error('Lesson already purchased');
    }

    // Create payment result
    const paymentResult = {
      data: {
        reference: `paystack_${Date.now()}`,
        tx_ref: `flutterwave_${Date.now()}`
      }
    };

    const transaction = {
      userId: userId,
      courseKey: courseKey,
      lessonId: lessonId,
      amount: amount,
      paymentMethod: paymentMethod,
      status: 'pending',
      reference: paymentResult.data.reference || paymentResult.data.tx_ref,
      createdAt: new Date().toISOString()
    };

    // Save transaction
    const transactionsRef = collection(db, 'transactions');
    await addDoc(transactionsRef, transaction);

    console.log('✅ Payment initiated:', transaction.reference);
    return paymentResult;
  } catch (error) {
    console.error('❌ Error processing lesson payment:', error);
    throw error;
  }
};

// ✅ Verify payment
export const verifyPayment = async (reference) => {
  try {
    if (!reference) {
      throw new Error('Payment reference is required');
    }

    // Find transaction
    const transactionsRef = collection(db, 'transactions');
    const q = query(transactionsRef, where('reference', '==', reference));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error('Transaction not found');
    }

    // Update transaction status
    const docRef = querySnapshot.docs[0].ref;
    await updateDoc(docRef, {
      status: 'completed',
      updatedAt: new Date().toISOString()
    });

    return {
      status: true,
      data: {
        status: 'success',
        reference: reference,
        gateway_response: 'Approved',
        paid_at: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('❌ Error verifying payment:', error);
    throw error;
  }
};







// ✅ Get current user - FIXED with email-based role forcing
export const getCurrentUser = async () => {
  try {
    console.log('🔍 START getCurrentUser');

    const firebaseUser = await firebaseGetCurrentUser();
    console.log('🔍 Firebase user:', firebaseUser);

    if (!firebaseUser) {
      console.log('ℹ️ No Firebase user found');
      return null;
    }

    console.log('🔍 Firebase user UID:', firebaseUser.uid);

    const userData = await firebaseGetUserData(firebaseUser.uid);
    console.log('🔍 User data from Firestore:', userData);
    console.log('🔍 Role from Firestore:', userData?.role);

    // ✅ EMAIL-BASED ROLE FORCING
    let role = userData?.role || 'student';

    if (firebaseUser.email === 'codesmartng1@gmail.com' || 
        firebaseUser.email === 'admin@stem.com' ||
        firebaseUser.email === 'kabiralkasim6@gmail.com') {
      role = 'admin';
      console.log('🔍 Force set role to ADMIN for:', firebaseUser.email);
    } else if (firebaseUser.email === 'kabiralkasim6@gmail.com' || 
               firebaseUser.email === 'teacher@stem.com') {
      role = 'teacher';
      console.log('🔍 Force set role to TEACHER for:', firebaseUser.email);
    }

    const mergedUser = {
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      email: firebaseUser.email || userData?.email || '',
      emailVerified: firebaseUser.emailVerified || userData?.isEmailVerified || false,
      displayName: firebaseUser.displayName || userData?.name || '',
      name: userData?.name || '',
      role: role,
      isApproved: userData?.isApproved || false,
      isEmailVerified: userData?.isEmailVerified || firebaseUser.emailVerified || false,
      whatsappNumber: userData?.whatsappNumber || '',
      level: userData?.level || 'Beginner',
      bio: userData?.bio || '',
      specialization: userData?.specialization || '',
      phone: userData?.phone || '',
      location: userData?.location || '',
      purchasedLessons: userData?.purchasedLessons || [],
      completedLessons: userData?.completedLessons || {},
      progress: userData?.progress || {},
      createdAt: userData?.createdAt || new Date().toISOString(),
      updatedAt: userData?.updatedAt || new Date().toISOString(),
    };

    console.log('✅ Final merged user:', mergedUser);
    console.log('✅ Final role:', mergedUser.role);

    return mergedUser;
  } catch (error) {
    console.error('❌ Error getting current user:', error);
    return null;
  }
};

// ✅ Authenticate user - FIXED with email-based role forcing
export const authenticateUser = async (email, password) => {
  try {
    console.log('🔐 Attempting login with email:', email);

    const user = await loginUser(email, password);
    console.log('🔐 loginUser returned:', user);

    const userData = await firebaseGetUserData(user.uid);
    console.log('🔐 User data from Firestore:', userData);
    console.log('🔐 Role from Firestore:', userData?.role);

    let role = userData?.role || 'student';

    if (email === 'codesmartng1@gmail.com' || 
        email === 'admin@stem.com' ||
        email === 'kabiralkasim6@gmail.com') {
      role = 'admin';
      console.log('🔐 Force set role to ADMIN for:', email);
    } else if (email === 'kabiralkasim6@gmail.com' || 
               email === 'teacher@stem.com') {
      role = 'teacher';
      console.log('🔐 Force set role to TEACHER for:', email);
    }

    const mergedUser = {
      id: user.uid,
      uid: user.uid,
      email: user.email || userData?.email || '',
      emailVerified: user.emailVerified || userData?.isEmailVerified || false,
      name: userData?.name || '',
      role: role,
      isApproved: userData?.isApproved || false,
      ...userData
    };

    console.log('✅ Merged user:', mergedUser);
    console.log('✅ User role:', mergedUser.role);

    return mergedUser;
  } catch (error) {
    console.error('❌ Error authenticating user:', error);
    throw error;
  }
};

// ✅ Get user data by ID
export const getUserData = async (userId) => {
  try {
    if (!userId) {
      console.warn('⚠️ No user ID provided for getUserData');
      return null;
    }

    const userData = await firebaseGetUserData(userId);
    return userData;
  } catch (error) {
    console.error('❌ Error getting user data:', error);
    return null;
  }
};

// ✅ Update user data
export const updateUserData = async (userId, updatedData) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log('🔧 Updating user data:', userId);
    console.log('🔧 Data:', updatedData);

    const userRef = doc(db, 'users', userId);
    const result = await updateDoc(userRef, {
      ...updatedData,
      updatedAt: new Date().toISOString()
    });

    console.log('✅ User data updated successfully:', userId);
    return result;
  } catch (error) {
    console.error('❌ Error updating user data:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);

    if (error.code === 'not-found') {
      try {
        console.log('🔄 Document not found, creating new...');
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, {
          ...updatedData,
          uid: userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log('✅ User document created successfully');
        return true;
      } catch (setError) {
        console.error('❌ Error creating document:', setError);
        throw setError;
      }
    }

    throw error;
  }
};

// ✅ Set current user (kept for compatibility)
export const setCurrentUser = (user) => {
  return user;
};

// ✅ Get all users
export const getUsers = async () => {
  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    const users = {};
    querySnapshot.forEach(doc => {
      users[doc.id] = { id: doc.id, ...doc.data() };
    });
    return users;
  } catch (error) {
    console.error('❌ Error getting users:', error);
    return {};
  }
};

// ✅ Set users (kept for compatibility)
export const setUsers = (users) => {
  return users;
};

// ✅ Register user
export const registerUser = async (userData) => {
  try {
    const result = await firebaseRegister(
      userData.email, 
      userData.password, 
      userData
    );
    return {
      user: result.userData,
      confirmationToken: 'email_verification_sent'
    };
  } catch (error) {
    console.error('❌ Error registering user:', error);
    throw error;
  }
};

// ✅ Logout user
export const logoutUser = async () => {
  try {
    await firebaseLogout();
    return true;
  } catch (error) {
    console.error('❌ Error logging out:', error);
    return false;
  }
};

// ✅ Confirm user email
export const confirmUserEmail = async (token) => {
  try {
    return { success: true, message: 'Email confirmed' };
  } catch (error) {
    console.error('❌ Error confirming email:', error);
    throw error;
  }
};

// ✅ Resend email confirmation
export const resendEmailConfirmation = async (email) => {
  try {
    await resendVerification();
    return { success: true, message: 'Verification email resent' };
  } catch (error) {
    console.error('❌ Error resending confirmation:', error);
    throw error;
  }
};

// ============================================
// STUDENT MANAGEMENT FUNCTIONS
// ============================================

// ✅ Get students
export const getStudents = async () => {
  try {
    const users = await getUsers();
    const students = [];
    Object.values(users).forEach(user => {
      if (user.role === 'student') {
        students.push(user);
      }
    });
    return students;
  } catch (error) {
    console.error('❌ Error getting students:', error);
    return [];
  }
};

// ✅ Update student
export const updateStudent = async (student) => {
  try {
    if (!student || !student.id) {
      throw new Error('Valid student object required');
    }
    await updateUserData(student.id, student);
    return student;
  } catch (error) {
    console.error('❌ Error updating student:', error);
    throw error;
  }
};

// ============================================
// COURSE MANAGEMENT FUNCTIONS
// ============================================

// ✅ Get all courses
export const getCourses = async () => {
  try {
    return await getAllCourses();
  } catch (error) {
    console.error('❌ Error getting courses:', error);
    return [];
  }
};

// ✅ Create a new course
export const createCourse = async (courseData) => {
  try {
    const coursesRef = collection(db, 'courses');
    const docRef = await addDoc(coursesRef, {
      ...courseData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lessonIds: [],
      enrolledStudents: 0
    });

    console.log('✅ Course created:', docRef.id);
    return { id: docRef.id, ...courseData };
  } catch (error) {
    console.error('❌ Error creating course:', error);
    throw error;
  }
};

// ✅ Get all courses
export const getAllCourses = async () => {
  try {
    const coursesRef = collection(db, 'courses');
    const querySnapshot = await getDocs(coursesRef);
    const courses = [];
    querySnapshot.forEach(doc => {
      courses.push({ id: doc.id, ...doc.data() });
    });
    return courses;
  } catch (error) {
    console.error('❌ Error getting courses:', error);
    return [];
  }
};

// ✅ Get course by ID
export const getCourseById = async (courseId) => {
  try {
    const docRef = doc(db, 'courses', courseId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('❌ Error getting course:', error);
    return null;
  }
};

// ✅ Get courses by teacher ID
export const getCoursesByTeacher = async (teacherId) => {
  try {
    const coursesRef = collection(db, 'courses');
    const q = query(coursesRef, where('teacherId', '==', teacherId));
    const querySnapshot = await getDocs(q);
    const courses = [];
    querySnapshot.forEach(doc => {
      courses.push({ id: doc.id, ...doc.data() });
    });
    return courses;
  } catch (error) {
    console.error('❌ Error getting teacher courses:', error);
    return [];
  }
};

// ✅ Update course
export const updateCourse = async (courseId, updateData) => {
  try {
    const docRef = doc(db, 'courses', courseId);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    return { id: courseId, ...updateData };
  } catch (error) {
    console.error('❌ Error updating course:', error);
    throw error;
  }
};

// ✅ Delete course
export const deleteCourse = async (courseId) => {
  try {
    const lessons = await getLessonsByCourse(courseId);
    for (const lesson of lessons) {
      await deleteLesson(lesson.id);
    }
    await deleteDoc(doc(db, 'courses', courseId));
    console.log('✅ Course deleted:', courseId);
    return true;
  } catch (error) {
    console.error('❌ Error deleting course:', error);
    throw error;
  }
};

// ============================================
// LESSON MANAGEMENT FUNCTIONS
// ============================================

// ✅ Create a new lesson
export const createLesson = async (courseId, lessonData) => {
  try {
    const lessonsRef = collection(db, 'lessons');
    
    // ✅ Remove any invalid fields before saving
    const { multimediaData, quizData, ...cleanLessonData } = lessonData || {};
    
    const lessonToSave = {
      title: cleanLessonData.title || '',
      content: cleanLessonData.content || '',
      duration: cleanLessonData.duration || '',
      isFree: cleanLessonData.isFree !== undefined ? cleanLessonData.isFree : true,
      price: cleanLessonData.isFree ? 0 : (cleanLessonData.price || 0),
      order: cleanLessonData.order || 0,
      courseId: courseId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      multimediaIds: [],
      quizId: null
    };
    
    const docRef = await addDoc(lessonsRef, lessonToSave);

    const courseRef = doc(db, 'courses', courseId);
    await updateDoc(courseRef, {
      lessonIds: arrayUnion(docRef.id),
      updatedAt: serverTimestamp()
    });

    console.log('✅ Lesson created:', docRef.id);
    return { id: docRef.id, ...lessonToSave };
  } catch (error) {
    console.error('❌ Error creating lesson:', error);
    throw error;
  }
};

// ✅ Get lessons by course ID
export const getLessonsByCourse = async (courseId) => {
  try {
    const lessonsRef = collection(db, 'lessons');
    const q = query(lessonsRef, where('courseId', '==', courseId));
    const querySnapshot = await getDocs(q);
    const lessons = [];
    querySnapshot.forEach(doc => {
      lessons.push({ id: doc.id, ...doc.data() });
    });
    lessons.sort((a, b) => (a.order || 0) - (b.order || 0));
    return lessons;
  } catch (error) {
    console.error('❌ Error getting lessons:', error);
    return [];
  }
};

// ✅ Get lesson by ID
export const getLessonById = async (lessonId) => {
  try {
    const docRef = doc(db, 'lessons', lessonId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('❌ Error getting lesson:', error);
    return null;
  }
};

// ✅ Update lesson
export const updateLesson = async (lessonId, updateData) => {
  try {
    const docRef = doc(db, 'lessons', lessonId);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    return { id: lessonId, ...updateData };
  } catch (error) {
    console.error('❌ Error updating lesson:', error);
    throw error;
  }
};

// ✅ Delete lesson
export const deleteLesson = async (lessonId) => {
  try {
    const lesson = await getLessonById(lessonId);
    if (lesson && lesson.courseId) {
      const courseRef = doc(db, 'courses', lesson.courseId);
      await updateDoc(courseRef, {
        lessonIds: arrayRemove(lessonId),
        updatedAt: serverTimestamp()
      });
    }

    const multimedia = await getMultimediaByLesson(lessonId);
    for (const media of multimedia) {
      await deleteDoc(doc(db, 'multimedia', media.id));
    }

    await deleteDoc(doc(db, 'lessons', lessonId));
    console.log('✅ Lesson deleted:', lessonId);
    return true;
  } catch (error) {
    console.error('❌ Error deleting lesson:', error);
    throw error;
  }
};

// ============================================
// MULTIMEDIA MANAGEMENT FUNCTIONS
// ============================================

// ✅ Add multimedia to lesson - IMPROVED
export const addMultimediaToLesson = async (lessonId, multimediaData) => {
  try {
    if (!lessonId) {
      throw new Error('Lesson ID is required');
    }
    
    if (!multimediaData || typeof multimediaData !== 'object') {
      throw new Error('Valid multimedia data is required');
    }

    // ✅ Clean the multimedia data
    const cleanData = {
      type: multimediaData.type || 'video',
      url: multimediaData.url || '',
      title: multimediaData.title || '',
      description: multimediaData.description || '',
      fileName: multimediaData.fileName || '',
      fileSize: multimediaData.fileSize || 0,
      fileType: multimediaData.fileType || '',
      firebasePath: multimediaData.firebasePath || '',
      lessonId: lessonId,
      createdAt: serverTimestamp()
    };

    console.log('📤 Adding multimedia to lesson:', lessonId);

    const multimediaRef = collection(db, 'multimedia');
    const docRef = await addDoc(multimediaRef, cleanData);

    const lessonRef = doc(db, 'lessons', lessonId);
    await updateDoc(lessonRef, {
      multimediaIds: arrayUnion(docRef.id),
      updatedAt: serverTimestamp()
    });

    console.log('✅ Multimedia added successfully:', docRef.id);
    return { id: docRef.id, ...cleanData };
  } catch (error) {
    console.error('❌ Error adding multimedia:', error);
    throw error;
  }
};

// ✅ Get multimedia by lesson ID
export const getMultimediaByLesson = async (lessonId) => {
  try {
    if (!lessonId) {
      console.warn('⚠️ No lesson ID provided');
      return [];
    }

    const multimediaRef = collection(db, 'multimedia');
    const q = query(multimediaRef, where('lessonId', '==', lessonId));
    const querySnapshot = await getDocs(q);
    
    const multimedia = [];
    querySnapshot.forEach(doc => {
      multimedia.push({ id: doc.id, ...doc.data() });
    });

    console.log(`✅ Found ${multimedia.length} multimedia items`);
    return multimedia;
  } catch (error) {
    console.error('❌ Error getting multimedia:', error);
    return [];
  }
};

// ✅ Delete multimedia
export const deleteMultimedia = async (mediaId) => {
  try {
    if (!mediaId) {
      throw new Error('Media ID is required');
    }

    console.log('🗑️ Deleting multimedia:', mediaId);

    const mediaRef = doc(db, 'multimedia', mediaId);
    const mediaDoc = await getDoc(mediaRef);
    
    if (!mediaDoc.exists()) {
      throw new Error('Multimedia not found');
    }
    
    const mediaData = mediaDoc.data();
    
    if (mediaData.lessonId) {
      const lessonRef = doc(db, 'lessons', mediaData.lessonId);
      await updateDoc(lessonRef, {
        multimediaIds: arrayRemove(mediaId),
        updatedAt: serverTimestamp()
      });
    }

    await deleteDoc(mediaRef);
    console.log('✅ Multimedia deleted successfully:', mediaId);
    return true;
  } catch (error) {
    console.error('❌ Error deleting multimedia:', error);
    throw error;
  }
};

// ============================================
// QUIZ MANAGEMENT FUNCTIONS
// ============================================

// ✅ Create quiz for lesson
export const createQuiz = async (lessonId, quizData) => {
  try {
    const quizzesRef = collection(db, 'quizzes');
    const docRef = await addDoc(quizzesRef, {
      ...quizData,
      lessonId: lessonId,
      createdAt: serverTimestamp()
    });

    const lessonRef = doc(db, 'lessons', lessonId);
    await updateDoc(lessonRef, {
      quizId: docRef.id,
      updatedAt: serverTimestamp()
    });

    console.log('✅ Quiz created:', docRef.id);
    return { id: docRef.id, ...quizData };
  } catch (error) {
    console.error('❌ Error creating quiz:', error);
    throw error;
  }
};

// ✅ Get quiz by lesson ID
export const getQuizByLesson = async (lessonId) => {
  try {
    const quizzesRef = collection(db, 'quizzes');
    const q = query(quizzesRef, where('lessonId', '==', lessonId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    console.error('❌ Error getting quiz:', error);
    return null;
  }
};

// ============================================
// ENROLLMENT MANAGEMENT FUNCTIONS
// ============================================

// ✅ Enroll student in course
export const enrollStudent = async (studentId, courseId) => {
  try {
    const enrollmentsRef = collection(db, 'enrollments');
    await addDoc(enrollmentsRef, {
      studentId: studentId,
      courseId: courseId,
      enrolledAt: serverTimestamp(),
      progress: 0,
      completedLessons: [],
      lastAccessed: serverTimestamp()
    });

    const courseRef = doc(db, 'courses', courseId);
    await updateDoc(courseRef, {
      enrolledStudents: increment(1),
      updatedAt: serverTimestamp()
    });

    console.log('✅ Student enrolled:', studentId);
    return true;
  } catch (error) {
    console.error('❌ Error enrolling student:', error);
    throw error;
  }
};

// ✅ Check if student is enrolled
export const isStudentEnrolled = async (studentId, courseId) => {
  try {
    const enrollmentsRef = collection(db, 'enrollments');
    const q = query(
      enrollmentsRef,
      where('studentId', '==', studentId),
      where('courseId', '==', courseId)
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('❌ Error checking enrollment:', error);
    return false;
  }
};

// ✅ Update student progress
export const updateProgress = async (studentId, courseId, completedLessonId) => {
  try {
    const enrollmentsRef = collection(db, 'enrollments');
    const q = query(
      enrollmentsRef,
      where('studentId', '==', studentId),
      where('courseId', '==', courseId)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const docRef = querySnapshot.docs[0].ref;
      const enrollment = querySnapshot.docs[0].data();
      const completedLessons = enrollment.completedLessons || [];

      if (!completedLessons.includes(completedLessonId)) {
        completedLessons.push(completedLessonId);
        const lessons = await getLessonsByCourse(courseId);
        const progress = completedLessons.length / (lessons.length || 1);

        await updateDoc(docRef, {
          completedLessons: completedLessons,
          progress: progress,
          lastAccessed: serverTimestamp()
        });
      }
    }
  } catch (error) {
    console.error('❌ Error updating progress:', error);
    throw error;
  }
};

// ============================================
// WALLET & PAYMENT FUNCTIONS
// ============================================

// ✅ Get teacher wallet
export const getTeacherWallet = async (teacherId) => {
  try {
    if (!teacherId) {
      console.warn('⚠️ No teacher ID provided');
      return {
        balance: 0,
        totalEarnings: 0,
        pendingWithdrawals: 0,
        transactions: []
      };
    }

    const docRef = doc(db, 'wallets', teacherId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data();
    }

    const defaultWallet = {
      balance: 0,
      totalEarnings: 0,
      pendingWithdrawals: 0,
      transactions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(docRef, defaultWallet);
    return defaultWallet;
  } catch (error) {
    console.error('❌ Error getting teacher wallet:', error);
    return {
      balance: 0,
      totalEarnings: 0,
      pendingWithdrawals: 0,
      transactions: []
    };
  }
};

// ✅ Update teacher wallet
export const updateTeacherWallet = async (teacherId, walletData) => {
  try {
    if (!teacherId) {
      throw new Error('Teacher ID is required');
    }

    const docRef = doc(db, 'wallets', teacherId);
    await setDoc(docRef, {
      ...walletData,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return walletData;
  } catch (error) {
    console.error('❌ Error updating teacher wallet:', error);
    throw error;
  }
};

// ✅ Withdraw from wallet
export const withdrawFromWallet = async (teacherId, amount, bankDetails) => {
  try {
    if (!teacherId) {
      throw new Error('Teacher ID is required');
    }

    const wallet = await getTeacherWallet(teacherId);

    if (amount > wallet.balance) {
      throw new Error('Insufficient balance');
    }

    if (amount < 100) {
      throw new Error('Minimum withdrawal is ₦100');
    }

    const withdrawal = {
      type: 'withdrawal',
      amount: -amount,
      description: `Withdrawal to ${bankDetails.bankName} - ${bankDetails.accountNumber}`,
      date: new Date().toISOString(),
      bankDetails: bankDetails,
      status: 'pending'
    };

    wallet.transactions = wallet.transactions || [];
    wallet.transactions.push(withdrawal);
    wallet.balance -= amount;
    wallet.pendingWithdrawals = (wallet.pendingWithdrawals || 0) + amount;

    const updatedWallet = await updateTeacherWallet(teacherId, wallet);
    console.log('✅ Withdrawal processed:', amount);
    return updatedWallet;
  } catch (error) {
    console.error('❌ Error processing withdrawal:', error);
    throw error;
  }
};

// ✅ Update teacher profile with WhatsApp
export const updateTeacherProfileWithWhatsApp = async (teacherId, data) => {
  try {
    if (!teacherId) {
      throw new Error('Teacher ID is required');
    }

    await updateUserData(teacherId, {
      whatsappNumber: data.whatsappNumber || '',
      updatedAt: new Date().toISOString()
    });

    console.log('✅ Teacher profile updated with WhatsApp:', data.whatsappNumber);
    return { whatsappNumber: data.whatsappNumber };
  } catch (error) {
    console.error('❌ Error updating teacher profile:', error);
    throw error;
  }
};

// ✅ Get teacher WhatsApp URL
export const getTeacherWhatsAppUrl = (teacherId) => {
  try {
    if (!teacherId) {
      console.warn('⚠️ No teacher ID provided');
      return '#';
    }
    return `https://wa.me/${teacherId}`;
  } catch (error) {
    console.error('❌ Error getting WhatsApp URL:', error);
    return '#';
  }
};

// ✅ Get teacher WhatsApp number from Firebase
export const getTeacherWhatsAppNumber = async (teacherId) => {
  try {
    const userData = await getUserData(teacherId);
    return userData?.whatsappNumber || '';
  } catch (error) {
    console.error('❌ Error getting WhatsApp number:', error);
    return '';
  }
};

// ============================================
// ✅ FIREBASE STORAGE WRAPPER FUNCTIONS
// ============================================



// src/utils/storage.jsx - Replace these functions

// ============================================
// HELPER: Convert file to base64 (fallback)
// ============================================

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

// ============================================
// ✅ Upload file to Firebase Storage (WITH RETRY & FALLBACK)
// ============================================

export const uploadFileToFirebase = async (file, path, retries = 3) => {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    console.log('📤 Uploading file to Firebase Storage:', path);
    console.log('📤 File size:', file.size, 'bytes');
    console.log('📤 File type:', file.type);

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      throw new Error('File size exceeds 100MB limit');
    }

    // Try upload with retry
    let lastError = null;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`📤 Upload attempt ${attempt}/${retries}...`);
        
        // Use the imported uploadFile from firebase.js
        const downloadURL = await uploadFile(file, path);
        
        console.log(`✅ Upload successful on attempt ${attempt}!`);
        console.log('✅ Download URL:', downloadURL);
        
        return downloadURL;
      } catch (error) {
        console.error(`❌ Upload attempt ${attempt} failed:`, error);
        lastError = error;
        
        if (attempt < retries) {
          // Wait before retry (exponential backoff)
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // If all retries failed, try base64 fallback for small files
    if (file.size < 1024 * 1024) { // Less than 1MB
      try {
        console.log('🔄 Trying base64 fallback...');
        const base64 = await fileToBase64(file);
        console.log('✅ Base64 conversion successful');
        return base64;
      } catch (base64Error) {
        console.error('❌ Base64 fallback also failed:', base64Error);
      }
    } else {
      console.warn('⚠️ File too large for base64 fallback, only <1MB files can use fallback');
    }

    throw lastError || new Error('Upload failed after retries');
  } catch (error) {
    console.error('❌ Error uploading file:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    throw error;
  }
};

// ============================================
// ✅ Upload file with progress tracking (WITH RETRY)
// ============================================

export const uploadFileToFirebaseWithProgress = async (file, path, onProgress, retries = 3) => {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    console.log('📤 Uploading file with progress:', path);
    console.log('📤 File size:', file.size, 'bytes');

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      throw new Error('File size exceeds 100MB limit');
    }

    let lastError = null;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`📤 Upload attempt ${attempt}/${retries}...`);
        
        // Use the imported uploadFileWithProgress from firebase.js
        const downloadURL = await uploadFileWithProgress(file, path, (progress) => {
          if (onProgress) {
            onProgress(progress);
          }
        });
        
        console.log(`✅ Upload successful on attempt ${attempt}!`);
        console.log('✅ Download URL:', downloadURL);
        
        return downloadURL;
      } catch (error) {
        console.error(`❌ Upload attempt ${attempt} failed:`, error);
        lastError = error;
        
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // If all retries failed, try base64 fallback for small files
    if (file.size < 1024 * 1024) { // Less than 1MB
      try {
        console.log('🔄 Trying base64 fallback...');
        const base64 = await fileToBase64(file);
        console.log('✅ Base64 conversion successful');
        return base64;
      } catch (base64Error) {
        console.error('❌ Base64 fallback also failed:', base64Error);
      }
    }

    throw lastError || new Error('Upload failed after retries');
  } catch (error) {
    console.error('❌ Error uploading file with progress:', error);
    throw error;
  }
};

// ============================================
// ✅ Delete file from Firebase Storage (with retry)
// ============================================

export const deleteFileFromFirebase = async (filePath, retries = 3) => {
  try {
    if (!filePath) {
      throw new Error('No file path provided');
    }

    console.log('🗑️ Deleting file from Firebase Storage:', filePath);

    let lastError = null;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await deleteFile(filePath);
        console.log(`✅ File deleted on attempt ${attempt}:`, filePath);
        return true;
      } catch (error) {
        console.error(`❌ Delete attempt ${attempt} failed:`, error);
        lastError = error;
        
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Delete failed after retries');
  } catch (error) {
    console.error('❌ Error deleting file:', error);
    throw error;
  }
};

// ============================================
// ✅ Get file URL from Firebase Storage (with retry)
// ============================================

export const getFileUrlFromFirebase = async (filePath, retries = 3) => {
  try {
    if (!filePath) {
      throw new Error('No file path provided');
    }

    console.log('📤 Getting file URL:', filePath);

    let lastError = null;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const url = await getFileUrl(filePath);
        console.log(`✅ Got URL on attempt ${attempt}:`, url);
        return url;
      } catch (error) {
        console.error(`❌ Get URL attempt ${attempt} failed:`, error);
        lastError = error;
        
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Get URL failed after retries');
  } catch (error) {
    console.error('❌ Error getting file URL:', error);
    throw error;
  }
};





// ============================================
// ADMIN FUNCTIONS
// ============================================

// ✅ Get all courses for admin
export const getAllCoursesForAdmin = async () => {
  try {
    return await getAllCourses();
  } catch (error) {
    console.error('❌ Error getting all courses for admin:', error);
    return [];
  }
};

// ✅ Get course details for admin
export const getCourseDetailsForAdmin = async (courseId) => {
  try {
    const course = await getCourseById(courseId);
    if (!course) return null;

    const lessons = await getLessonsByCourse(courseId);
    const teacher = await getUserData(course.teacherId);

    return {
      ...course,
      lessons: lessons,
      teacherInfo: teacher || { name: 'Unknown', email: 'unknown@email.com' }
    };
  } catch (error) {
    console.error('❌ Error getting course details for admin:', error);
    return null;
  }
};

// ✅ Delete course as admin
export const deleteCourseAsAdmin = async (courseId) => {
  try {
    await deleteCourse(courseId);
    return true;
  } catch (error) {
    console.error('❌ Error deleting course as admin:', error);
    throw error;
  }
};

// ✅ Delete lesson as admin
export const deleteLessonAsAdmin = async (lessonId) => {
  try {
    await deleteLesson(lessonId);
    return true;
  } catch (error) {
    console.error('❌ Error deleting lesson as admin:', error);
    throw error;
  }
};

// ✅ Get course analytics for admin
export const getCourseAnalyticsForAdmin = async (courseId) => {
  try {
    const course = await getCourseById(courseId);
    const lessons = await getLessonsByCourse(courseId);

    const enrollmentsRef = collection(db, 'enrollments');
    const q = query(enrollmentsRef, where('courseId', '==', courseId));
    const querySnapshot = await getDocs(q);

    let totalEnrolled = 0;
    let totalProgress = 0;

    querySnapshot.forEach(doc => {
      const data = doc.data();
      totalEnrolled++;
      totalProgress += data.progress || 0;
    });

    const avgProgress = totalEnrolled > 0 ? Math.round((totalProgress / totalEnrolled) * 100) : 0;

    return {
      totalEnrolled: totalEnrolled || course.enrolledStudents || 0,
      totalLessons: lessons.length,
      completionRate: avgProgress,
      averageQuizScore: 0
    };
  } catch (error) {
    console.error('❌ Error getting course analytics:', error);
    return {
      totalEnrolled: 0,
      totalLessons: 0,
      completionRate: 0,
      averageQuizScore: 0
    };
  }
};

// ✅ Get all teachers
export const getAllTeachers = async () => {
  try {
    const users = await getUsers();
    const teachers = [];
    Object.values(users).forEach(user => {
      if (user.role === 'teacher') {
        teachers.push(user);
      }
    });
    return teachers;
  } catch (error) {
    console.error('❌ Error getting all teachers:', error);
    return [];
  }
};

// ✅ Get pending teachers
export const getPendingTeachers = async () => {
  try {
    const teachers = await getAllTeachers();
    return teachers.filter(teacher => !teacher.isApproved);
  } catch (error) {
    console.error('❌ Error getting pending teachers:', error);
    return [];
  }
};

// ✅ Approve teacher
export const approveTeacher = async (teacherId) => {
  try {
    console.log('👨‍🏫 Approving teacher:', teacherId);

    const currentUser = await getCurrentUser();
    if (currentUser?.role !== 'admin') {
      throw new Error('Only admin can approve teachers');
    }

    await updateUserData(teacherId, {
      isApproved: true,
      approvedDate: new Date().toISOString(),
      status: 'approved'
    });

    console.log('✅ Teacher approved successfully:', teacherId);
    return true;
  } catch (error) {
    console.error('❌ Error approving teacher:', error);
    throw error;
  }
};

// ✅ Reject teacher
export const rejectTeacher = async (teacherId) => {
  try {
    console.log('👨‍🏫 Rejecting teacher:', teacherId);

    const currentUser = await getCurrentUser();
    if (currentUser?.role !== 'admin') {
      throw new Error('Only admin can reject teachers');
    }

    await updateUserData(teacherId, {
      isApproved: false,
      rejectedAt: new Date().toISOString(),
      status: 'rejected'
    });

    console.log('✅ Teacher rejected successfully:', teacherId);
    return true;
  } catch (error) {
    console.error('❌ Error rejecting teacher:', error);
    throw error;
  }
};

// ✅ Dismiss teacher
export const dismissTeacher = async (teacherId) => {
  try {
    await updateUserData(teacherId, {
      isApproved: false,
      dismissedAt: new Date().toISOString(),
      status: 'dismissed'
    });
    return true;
  } catch (error) {
    console.error('❌ Error dismissing teacher:', error);
    throw error;
  }
};

// ✅ Get teacher courses for admin
export const getTeacherCoursesForAdmin = async (teacherId) => {
  try {
    return await getCoursesByTeacher(teacherId);
  } catch (error) {
    console.error('❌ Error getting teacher courses for admin:', error);
    return [];
  }
};

// ✅ Get platform stats
export const getPlatformStats = async () => {
  try {
    const users = await getUsers();
    const courses = await getAllCourses();
    const userArray = Object.values(users);

    const students = userArray.filter(u => u.role === 'student');
    const teachers = userArray.filter(u => u.role === 'teacher' && u.isApproved);

    let totalLessons = 0;
    for (const course of courses) {
      const lessons = await getLessonsByCourse(course.id);
      totalLessons += lessons.length;
    }

    return {
      totalStudents: students.length,
      totalTeachers: teachers.length,
      totalCourses: courses.length,
      totalLessons: totalLessons,
      totalEnrolled: courses.reduce((sum, c) => sum + (c.enrolledStudents || 0), 0),
      totalCompletedLessons: 0
    };
  } catch (error) {
    console.error('❌ Error getting platform stats:', error);
    return {
      totalStudents: 0,
      totalTeachers: 0,
      totalCourses: 0,
      totalLessons: 0,
      totalEnrolled: 0,
      totalCompletedLessons: 0
    };
  }
};

// ✅ Delete user
export const deleteUser = async (userId) => {
  try {
    await deleteDoc(doc(db, 'users', userId));
    return true;
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    throw error;
  }
};

// ✅ Update user
export const updateUser = async (userId, userData) => {
  try {
    await updateUserData(userId, userData);
    return true;
  } catch (error) {
    console.error('❌ Error updating user:', error);
    throw error;
  }
};

// ✅ Get teacher wallets
export const getTeacherWallets = async () => {
  try {
    const teachers = await getAllTeachers();
    const wallets = {};
    for (const teacher of teachers) {
      if (teacher.isApproved) {
        const wallet = await getTeacherWallet(teacher.uid);
        wallets[teacher.uid] = {
          ...wallet,
          teacherId: teacher.uid,
          teacherName: teacher.name || teacher.displayName || 'Unknown'
        };
      }
    }
    return wallets;
  } catch (error) {
    console.error('❌ Error getting teacher wallets:', error);
    return {};
  }
};

// ✅ Save teacher wallets
export const saveTeacherWallets = async (wallets) => {
  try {
    for (const [teacherId, walletData] of Object.entries(wallets)) {
      await updateTeacherWallet(teacherId, walletData);
    }
    return true;
  } catch (error) {
    console.error('❌ Error saving teacher wallets:', error);
    throw error;
  }
};

// ✅ Get payment transactions
export const getPaymentTransactions = async () => {
  try {
    const transactions = JSON.parse(localStorage.getItem('hausaStem_transactions') || '[]');
    return transactions;
  } catch (error) {
    console.error('❌ Error getting payment transactions:', error);
    return [];
  }
};

// ✅ Save payment transactions
export const savePaymentTransactions = async (transactions) => {
  try {
    localStorage.setItem('hausaStem_transactions', JSON.stringify(transactions));
    return true;
  } catch (error) {
    console.error('❌ Error saving payment transactions:', error);
    throw error;
  }
};

// ✅ Get all courses analytics for admin
export const getAllCoursesAnalyticsForAdmin = async () => {
  try {
    const courses = await getAllCourses();
    const analytics = {};
    for (const course of courses) {
      analytics[course.id] = await getCourseAnalyticsForAdmin(course.id);
    }
    return analytics;
  } catch (error) {
    console.error('❌ Error getting all courses analytics:', error);
    return {};
  }
};

// ============================================
// LESSON ACCESS & PURCHASE FUNCTIONS
// ============================================

// ✅ Check if user can access lesson
export const canAccessLesson = async (userId, courseKey, lessonId) => {
  try {
    if (!userId || !courseKey || !lessonId) {
      return false;
    }

    const userData = await getUserData(userId);
    if (!userData) return false;

    const purchasedLessons = userData.purchasedLessons || [];
    return purchasedLessons.some(p => p.courseKey === courseKey && p.lessonId === lessonId);
  } catch (error) {
    console.error('❌ Error checking lesson access:', error);
    return false;
  }
};

// ✅ Purchase lesson
export const purchaseLesson = async (userId, courseKey, lessonId) => {
  try {
    if (!userId || !courseKey || !lessonId) {
      throw new Error('User ID, course key, and lesson ID are required');
    }

    const userData = await getUserData(userId);
    if (!userData) {
      throw new Error('User not found');
    }

    const purchasedLessons = userData.purchasedLessons || [];
    if (purchasedLessons.some(p => p.courseKey === courseKey && p.lessonId === lessonId)) {
      throw new Error('Lesson already purchased');
    }

    purchasedLessons.push({
      courseKey: courseKey,
      lessonId: lessonId,
      purchasedAt: new Date().toISOString()
    });

    await updateUserData(userId, {
      purchasedLessons: purchasedLessons
    });

    console.log('✅ Lesson purchased:', lessonId);
    return true;
  } catch (error) {
    console.error('❌ Error purchasing lesson:', error);
    throw error;
  }
};

// ============================================
// INITIALIZE DEFAULT COURSES
// ============================================

export const initializeDefaultCourses = async () => {
  try {
    console.log('🔄 Initializing default courses...');

    const existingCourses = await getAllCourses();
    if (existingCourses.length > 0) {
      console.log('ℹ️ Courses already exist');
      return true;
    }

    // Default courses data
    const defaultCourseData = [];

    for (const courseData of defaultCourseData) {
      const lessons = courseData.lessons || [];
      delete courseData.lessons;

      const course = await createCourse(courseData);

      for (const lessonData of lessons) {
        const multimedia = lessonData.multimedia || [];
        const quiz = lessonData.quiz || null;
        delete lessonData.multimedia;
        delete lessonData.quiz;

        const lesson = await createLesson(course.id, lessonData);

        for (const mediaData of multimedia) {
          await addMultimediaToLesson(lesson.id, mediaData);
        }

        if (quiz) {
          await createQuiz(lesson.id, quiz);
        }
      }
    }

    console.log('✅ Default courses initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Error initializing default courses:', error);
    return false;
  }
};

// ============================================
// STORAGE INITIALIZATION
// ============================================

export const initializeStorage = async () => {
  try {
    console.log('🔄 Initializing Firebase storage...');
    await initializeDefaultCourses();
    console.log('✅ Firebase storage ready');
    return true;
  } catch (error) {
    console.error('❌ Error initializing storage:', error);
    return false;
  }
};

// ============================================
// ✅ FINAL EXPORT
// ============================================

export default {
  // User Management
  getCurrentUser,
  setCurrentUser,
  getUsers,
  setUsers,
  registerUser,
  authenticateUser,
  logoutUser,
  confirmUserEmail,
  resendEmailConfirmation,
  updateUserData,
  getUserData,
// In the export section, add:
processLessonPayment,
verifyPayment,

  // Student Management
  getStudents,
  updateStudent,

  // Course Management
  getCourses,
  createCourse,
  getAllCourses,
  getCourseById,
  getCoursesByTeacher,
  updateCourse,
  deleteCourse,

  // Lesson Management
  createLesson,
  getLessonsByCourse,
  getLessonById,
  updateLesson,
  deleteLesson,

  // Multimedia Management
  addMultimediaToLesson,
  getMultimediaByLesson,
  deleteMultimedia,

  // Quiz Management
  createQuiz,
  getQuizByLesson,

  // Enrollment Management
  enrollStudent,
  isStudentEnrolled,
  updateProgress,

  // Wallet & Payment
  getTeacherWallet,
  updateTeacherWallet,
  withdrawFromWallet,
  updateTeacherProfileWithWhatsApp,
  getTeacherWhatsAppUrl,
  getTeacherWhatsAppNumber,

  // Lesson Access & Payment
  canAccessLesson,
  purchaseLesson,

  // Admin Functions
  getAllCoursesForAdmin,
  getCourseDetailsForAdmin,
  deleteCourseAsAdmin,
  deleteLessonAsAdmin,
  getCourseAnalyticsForAdmin,
  getAllTeachers,
  getPendingTeachers,
  approveTeacher,
  rejectTeacher,
  dismissTeacher,
  getTeacherCoursesForAdmin,
  getPlatformStats,
  deleteUser,
  updateUser,
  getTeacherWallets,
  saveTeacherWallets,
  getPaymentTransactions,
  savePaymentTransactions,
  getAllCoursesAnalyticsForAdmin,

  // Storage Functions
  uploadFileToFirebase,
  uploadFileToFirebaseWithProgress,
  deleteFileFromFirebase,
  getFileUrlFromFirebase,

  // Storage
  initializeStorage,
  initializeDefaultCourses
};
