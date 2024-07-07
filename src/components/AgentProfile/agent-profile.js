import React, { useState, useEffect } from 'react';
import { getDoc, doc, query, where, getDocs, collection, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db } from '../../firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import TopBar from '../TopBar';
import BottomBar from '../BottomBar';
import './agent-profile.css';
import { FaEdit } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const AgentProfile = ({ setDirection }) => {
  const [agentData, setAgentData] = useState({});
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    zip: ''
  });
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [fieldToEdit, setFieldToEdit] = useState('');
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAgentData = async (userEmail) => {
      try {
        const agentQuery = query(collection(db, 'Agents'), where('email', '==', userEmail));
        const agentSnapshot = await getDocs(agentQuery);
        if (!agentSnapshot.empty) {
          const agentDoc = agentSnapshot.docs[0];
          const data = agentDoc.data();
          setAgentData({ ...data, id: agentDoc.id });
          setEmail(data.email);
          setPhoneNumber(data.phoneNumber);
          if (data.address) {
            setAddress(data.address);
          }
        } else {
          console.error('No such agent!');
        }
      } catch (error) {
        console.error('Error fetching agent data:', error);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchAgentData(user.email);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    try {
      const agentRef = doc(db, 'Agents', agentData.id);
      const updatedData = fieldToEdit === 'email' 
        ? { email } 
        : fieldToEdit === 'phoneNumber' 
        ? { phoneNumber } 
        : { address };
      await updateDoc(agentRef, updatedData);
      setAgentData({ ...agentData, ...updatedData });
      setIsPopupOpen(false);
    } catch (error) {
      console.error('Error updating agent data:', error);
    }
  };

  const openPopup = (field) => {
    setFieldToEdit(field);
    setIsPopupOpen(true);
  };

  const closePopup = () => {
    setIsPopupOpen(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    try {
      const storage = getStorage();
      const storageRef = ref(storage, `profilePhotos/${agentData.id}`);
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);

      // Update Firestore with the new photo URL
      const agentRef = doc(db, 'Agents', agentData.id);
      await updateDoc(agentRef, { photoURL });

      // Update state
      setAgentData((prevState) => ({ ...prevState, photoURL }));
      setUploading(false);
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      setUploading(false);
    }
  };

  return (
    <div className="agent-profile">
      <TopBar photoURL={agentData.photoURL} displayName={agentData.displayName} setDirection={setDirection} />
      <div className="profile-container">
        <div className="profile-box">
          <h2>Basic Information</h2>
          <div className="profile-field">
            <label>Full Name:</label>
            <span>{agentData.displayName}</span>
          </div>
          <div className="profile-field">
            <label>Email:</label>
            <span>{email}</span>
            <FaEdit className="edit-icon" onClick={() => openPopup('email')} />
          </div>
          <div className="profile-field">
            <label>Phone Number:</label>
            <span>{phoneNumber}</span>
            <FaEdit className="edit-icon" onClick={() => openPopup('phoneNumber')} />
          </div>
          <div className="profile-field">
            <label>Address:</label>
            <span>{address.line1}, {address.line2}, {address.city}, {address.state}, {address.zip}</span>
            <FaEdit className="edit-icon" onClick={() => openPopup('address')} />
          </div>
          <div className="profile-field">
            <label>Serving County:</label>
            <span>{agentData.serving_county?.join(', ')}</span>
          </div>
          <div className="profile-field">
            <label>Profile Photo:</label>
            <input className="profile-photo-input" type="file" accept="image/*" onChange={handleFileChange} />
            {uploading && <span>Uploading...</span>}
          </div>
        </div>
        <button className="logout-button" onClick={handleLogout}>Logout</button>
      </div>

      {isPopupOpen && (
        <div className="popup">
          <div className="popup-content">
            <h3>Edit {fieldToEdit === 'email' ? 'Email' : fieldToEdit === 'phoneNumber' ? 'Phone Number' : 'Address'}</h3>
            {fieldToEdit === 'address' ? (
              <>
                <input
                  type="text"
                  placeholder="Address Line 1"
                  value={address.line1}
                  onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Address Line 2"
                  value={address.line2}
                  onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="City"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="State"
                  value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Zip Code"
                  value={address.zip}
                  onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                />
              </>
            ) : (
              <input
                type={fieldToEdit === 'email' ? 'email' : 'tel'}
                value={fieldToEdit === 'email' ? email : phoneNumber}
                onChange={(e) => fieldToEdit === 'email' ? setEmail(e.target.value) : setPhoneNumber(e.target.value)}
              />
            )}
            <div className="popup-buttons">
              <button onClick={handleSave}>Save</button>
              <button onClick={closePopup}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <BottomBar />
    </div>
  );
};

export default AgentProfile;
