import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, query, where, getDocs, updateDoc, arrayUnion, Timestamp, setDoc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import TopBar from '../TopBar';
import BottomBar from '../BottomBar';
import './detail-service-delivery.css';
import BackButton from '../BackButton/back-button.js';

const DetailServiceDelivery = ({ setDirection }) => {
  const { applicationId } = useParams();
  const [applicationData, setApplicationData] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [agentData, setAgentData] = useState({});
  const [showDocsPopup, setShowDocsPopup] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const agentQuery = query(collection(db, 'Agents'), where('email', '==', user.email));
          const agentSnapshot = await getDocs(agentQuery);
          if (!agentSnapshot.empty) {
            const agent = agentSnapshot.docs[0].data();
            setAgentData(agent);
            await fetchApplicationAndClientData(agent.displayName);
          } else {
            console.error('Agent document does not exist');
          }
        } catch (error) {
          console.error('Error fetching agent document:', error);
        }
      }
    });

    return () => unsubscribe();
  }, [applicationId]);

  const fetchApplicationAndClientData = async (displayName) => {
    if (!displayName || !applicationId) {
      console.error('Missing displayName or applicationId');
      setIsLoading(false);
      return;
    }

    try {
      const applicationRef = doc(db, 'Applications', applicationId);
      const applicationSnap = await getDoc(applicationRef);

      if (applicationSnap.exists()) {
        const applicationData = applicationSnap.data();
        const clientId = applicationData.auto_filled_form_data?.client_id;
        if (!clientId) {
          console.error('Missing client_id in application data');
          setIsLoading(false);
          return;
        }

        const clientQuery = query(collection(db, 'Clients'), where('client_id', '==', clientId), where('assigned_agent_id', '==', displayName));
        const clientSnapshot = await getDocs(clientQuery);

        if (!clientSnapshot.empty) {
          const clientData = clientSnapshot.docs[0].data();
          setApplicationData(applicationData);
          setClientData(clientData);
          if (applicationData.uploaded_documents_path) {
            setUploadedDocs(Object.values(applicationData.uploaded_documents_path));
          }
        } else {
          console.error('No matching client data found');
        }
      } else {
        console.error('No such application!');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocsPopupOpen = () => {
    setShowDocsPopup(true);
  };

  const handleDocsPopupClose = () => {
    setShowDocsPopup(false);
  };

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (!applicationData || !clientData) {
    return <div className="error">Application or Client data not found.</div>;
  }

  const filledFormUrl = applicationData?.filled_form;
  const voiceRecordUrl = applicationData?.auto_filled_form_data?.recorded_voice_path;

  return (
    <div className="detail-service-delivery">
      <BackButton />
      <div className="content">
        <div className="client-info-DSD-2">
          <div className="client-photo">
            <img src={clientData.profile_photo_url} alt="Client" />
          </div>
          <div className="client-name-DSD">{clientData.full_name}</div>
        </div>
        <div className="basic-info">
          <h3>Basic Information</h3>
          <p>Client ID: {clientData.client_id}</p>
          <p>Username: {clientData.username}</p>
          <p>Country: {clientData.country}</p>
          <p>Email: {clientData.email}</p>
          <p>Language Preference: {clientData.language_preference}</p>
          <p>Nationality: {clientData.nationality}</p>
        </div>
        <div className="service-request">
          <h3>Service Request</h3>
          <button className="service-button" onClick={() => window.open(voiceRecordUrl, '_blank')}>See full record</button>
          <button className="service-button" onClick={() => window.open(filledFormUrl, '_blank')}>See filled form</button>
          <button className="service-button" onClick={handleDocsPopupOpen}>See uploaded docs</button>
        </div>
        <div className="agent-service-submit-DSD">
          <h3>Agent Submitted Services</h3>
          <ul>
            {applicationData.agent_service_submit?.map((service, index) => (
              <li key={index}>{service}</li>
            ))}
          </ul>
        </div>
        <div className="action-buttons-DSD">
          <button className="chat-button" onClick={() => navigate(`/agent-client-chat/${applicationData.auto_filled_form_data.client_id}`)}>Initiate Personal Chatroom</button>
        </div>
      </div>
      {showDocsPopup && (
        <div className="docs-popup">
          <div className="popup-content">
            <h3>Uploaded Documents</h3>
            <ul>
              {uploadedDocs.length > 0 && uploadedDocs.map(docArray => (
                <li key={docArray[0]}>
                  <a href={docArray[1]} target="_blank" rel="noopener noreferrer">{docArray[0]}</a>
                </li>
              ))}
            </ul>
            <button className="close-button" onClick={handleDocsPopupClose}>Close</button>
          </div>
        </div>
      )}
      <BottomBar />
    </div>
  );
};

export default DetailServiceDelivery;
