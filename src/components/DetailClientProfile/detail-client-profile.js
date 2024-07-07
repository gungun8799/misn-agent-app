import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, query, where, getDocs, collection, setDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import TopBar from '../TopBar';
import BottomBar from '../BottomBar';
import './detail-client-profile.css';
import BackButton from '../BackButton/back-button.js';


const DetailClientProfile = ({ setDirection }) => {
  const { clientId } = useParams();
  const [clientData, setClientData] = useState({});
  const [curatedDocuments, setCuratedDocuments] = useState([]);
  const [historicalServices, setHistoricalServices] = useState([]); // Added this state
  const [showDocsPopup, setShowDocsPopup] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClientData = async () => {
      try {
        const clientRef = doc(db, 'Clients', clientId);
        const clientSnap = await getDoc(clientRef);
        if (clientSnap.exists()) {
          const clientData = clientSnap.data();
          setClientData(clientData);
          fetchCuratedDocuments(clientData.client_id);
          fetchHistoricalServices(clientData.client_id); // Added this call
          fetchUploadedDocuments(clientData.client_id);
        } else {
          console.error('No such client!');
        }
      } catch (error) {
        console.error('Error fetching client data:', error);
      }
    };

    fetchClientData();
  }, [clientId]);

  const fetchCuratedDocuments = async (client_id) => {
    try {
      const applicationsQuery = query(collection(db, 'Applications'), where('auto_filled_form_data.client_id', '==', client_id));
      const applicationsSnapshot = await getDocs(applicationsQuery);
      const docsList = applicationsSnapshot.docs.map(doc => {
        const appData = doc.data();
        const status = appData.auto_filled_form_data.status;
        let displayStatus = '';
        switch (status) {
          case 'submitted':
            displayStatus = 'Wait for your approval';
            break;
          case 'request_docs':
          case 'request_additional_docs':
            displayStatus = 'Wait for client to submit docs';
            break;
          case 'approved':
            displayStatus = 'Wait for you to match service';
            break;
          case 'rejected':
            displayStatus = 'Request Rejected';
            break;
          case 'service_received':
            displayStatus = 'Service Received';
            break;
          default:
            displayStatus = status;
        }
        return {
          id: doc.id,
          summary: appData.application_summary,
          status: displayStatus
        };
      });
      setCuratedDocuments(docsList);
    } catch (error) {
      console.error('Error fetching curated documents:', error);
    }
  };

  const fetchHistoricalServices = async (client_id) => {
    try {
      const applicationsQuery = query(collection(db, 'Applications'), where('auto_filled_form_data.client_id', '==', client_id));
      const applicationsSnapshot = await getDocs(applicationsQuery);
      const servicesList = applicationsSnapshot.docs.map(doc => {
        const appData = doc.data().auto_filled_form_data;
        return {
          final_program_name: appData.final_program_name,
          status: appData.status,
          document_link: appData.uploaded_documents_path ? appData.uploaded_documents_path[0] : null
        };
      });
      setHistoricalServices(servicesList);
    } catch (error) {
      console.error('Error fetching historical services:', error);
    }
  };

  const fetchUploadedDocuments = async (client_id) => {
    try {
      const applicationsQuery = query(collection(db, 'Applications'), where('auto_filled_form_data.client_id', '==', client_id));
      const applicationsSnapshot = await getDocs(applicationsQuery);
      const docsList = [];
      applicationsSnapshot.forEach(doc => {
        const appData = doc.data();
        if (appData.uploaded_documents_path) {
          docsList.push(...Object.values(appData.uploaded_documents_path));
        }
      });
      setUploadedDocs(docsList);
    } catch (error) {
      console.error('Error fetching uploaded documents:', error);
    }
  };

  const handleDocsPopupOpen = () => {
    setShowDocsPopup(true);
  };

  const handleDocsPopupClose = () => {
    setShowDocsPopup(false);
  };

  const handleChatWithClient = async () => {
    try {
      const chatRef = doc(db, 'AgentChat', clientData.client_id);
      const docSnap = await getDoc(chatRef);
      if (!docSnap.exists()) {
        await setDoc(chatRef, {
          Agent_chat: [],
          Client_chat: []
        });
      }
      navigate(`/agent-client-chat/${clientData.client_id}`);
    } catch (error) {
      console.error('Error setting up chat:', error);
      alert('Failed to set up chat. Please try again.');
    }
  };

  const handleScheduleVisit = () => {
    navigate('/visit-schedule/undefined');
  };

  if (!clientData.client_id) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="detail-client-profile">
      <BackButton />
      <div className="client-detail">
        <div className="profile-card-DCP">
          <img src={clientData.profile_photo_url} alt="Profile" className="profile-photo" />
          <h2 className="client-name-DCP">{clientData.full_name}</h2>
          <p className="client-id">user {clientData.client_id}</p>
        </div>
        <div className="basic-info-card-DCP">
          <h3>Basic Information</h3>
          <p><strong>Nationality:</strong> {clientData.nationality}</p>
          <p><strong>Age:</strong> {clientData.age}</p>
          <p><strong>Address:</strong> {clientData.address ? `${clientData.address.address_line_1}, ${clientData.address.address_line_2}, ${clientData.address.city}, ${clientData.address.zip}` : ''}</p>
          <p><strong>Phone:</strong> {clientData.phoneNumber}</p>
          <p><strong>Email:</strong> {clientData.email}</p>
        </div>
        <div className="info-card-DCP">
          <h3>Requests</h3>
          {curatedDocuments.map((doc, index) => (
            <div key={index} className="service-item-DCP">
              <p className="request-summary-DCP">{doc.summary}</p>
              <p className="request-status-DCP">Status : {doc.status}</p>
            </div>
          ))}
        </div>
        <div className="info-card-DCP">
          <h3>Client attachments</h3>
          <button className="doc-button-DCP" onClick={handleDocsPopupOpen}>See uploaded documents</button>
          <button className="record-button-DCP">See full record</button>
        </div>
        {/* <div className="historical-services">
          {historicalServices.map((service, index) => (
            <div key={index} className="service-item">
              <p>Program: {service.final_program_name}</p>
              <p>Status: {service.status}</p>
              {service.document_link && (
                <button onClick={() => window.open(service.document_link, '_blank')}>See Document</button>
              )}
            </div>
          ))}
        </div> */}
        <button onClick={handleChatWithClient} className="chat-button-DCP">Chat with Client</button>
        <button onClick={handleScheduleVisit} className="schedule-visit-button-DCP">Schedule a Visit</button>
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

export default DetailClientProfile;
