import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, query, where, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import TopBar from '../TopBar';
import BottomBar from '../BottomBar';
import './detail-service-matching.css';
import BackButton from '../BackButton/back-button.js';

const DetailServiceMatching = ({ setDirection }) => {
  const { applicationId } = useParams();
  const [applicationData, setApplicationData] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [agentData, setAgentData] = useState({});
  const [matchedServices, setMatchedServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [showCommentPopup, setShowCommentPopup] = useState(false);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [comment, setComment] = useState('');
  const [statusToChange, setStatusToChange] = useState('');
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
          setMatchedServices(applicationData.system_matched_services || []);
          setSelectedServices(applicationData.system_matched_services || []);
          await fetchServices(applicationData.system_matched_services || []);
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

  const fetchServices = async (programName) => {
    try {
      const servicesQuery = query(collection(db, 'Services'));
      const servicesSnapshot = await getDocs(servicesQuery);
      servicesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        Object.keys(data).forEach(key => {
          if (key.toLowerCase() === programName.toLowerCase()) {
            setAllServices(Object.keys(data[key]));
          }
        });
      });
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const handleStatusChange = async () => {
    try {
      const applicationRef = doc(db, 'Applications', applicationId);
      await updateDoc(applicationRef, {
        'auto_filled_form_data.status': statusToChange,
        agent_comment: arrayUnion(comment),
      });
      alert(`Application ${statusToChange} successfully!`);
      setShowCommentPopup(false);
      setComment('');
    } catch (error) {
      console.error('Error updating document:', error);
      alert(`Failed to update application status.`);
    }
  };

  const handleRequestDocs = () => {
    setStatusToChange('request_additional_docs');
    setShowCommentPopup(true);
  };

  const handleSubmitService = () => {
    setShowConfirmPopup(true);
  };

  const handleConfirmSubmission = async () => {
    try {
      const applicationRef = doc(db, 'Applications', applicationId);
      await updateDoc(applicationRef, {
        agent_service_submit: arrayUnion(...selectedServices),
        'auto_filled_form_data.status': 'service_submitted'
      });
      alert(`Services submitted successfully!`);
      setShowConfirmPopup(false);
      navigate('/ServiceMatching');
    } catch (error) {
      console.error('Error submitting services:', error);
      alert(`Failed to submit services.`);
    }
  };

  const handleConfirmComment = async () => {
    await handleStatusChange();
  };

  const handleCheckboxChange = (service) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(selectedServices.filter(s => s !== service));
    } else {
      setSelectedServices([...selectedServices, service]);
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
    <div className="detail-service-matching">
      
        <BackButton />
        <div className="client-info-DSM">
          <div className="client-photo-DSM">
            <img src={clientData.profile_photo_url} alt="Client" />
          </div>
          <div className="client-name-DSM">{clientData.full_name}</div>
        </div>

      <div className="content">

        <div className="basic-info-DSM">
          <h3>Basic Information</h3>
          <p>Client ID: {clientData.client_id}</p>
          <p>County: {clientData.county}</p>
          <p>Email: {clientData.email}</p>
          <p>Language Preference: {clientData.language_preference}</p>
          <p>Nationality: {clientData.nationality}</p>
        </div>
        <div className="service-request-DSM">
          <h3>Service Request</h3>
          <button className="service-button" onClick={() => window.open(voiceRecordUrl, '_blank')}>See full record</button>
          <button className="service-button" onClick={() => window.open(filledFormUrl, '_blank')}>See filled form</button>
          <button className="service-button" onClick={handleDocsPopupOpen}>See uploaded docs</button>
        </div>
        <div className="request-summary-DSM">
          <h3>Summary of the request</h3>
          <p>{applicationData.application_summary}</p>
        </div>
        <div className="system-matched-services-DSM">
          <h3>Matched by system</h3>
          {matchedServices.map(service => (
            <div key={service} className="service-item">
              <input
                type="checkbox"
                id={service}
                name="service"
                value={service}
                checked={selectedServices.includes(service)}
                onChange={() => handleCheckboxChange(service)}
              />
              <label htmlFor={service}>{service}</label>
            </div>
          ))}
        </div>
        <div className="action-buttons-DSM">
          {/* <button className="request-docs-button-2" onClick={handleRequestDocs}>Request additional docs</button> */}
          <button className="submit-service-button-2" onClick={handleSubmitService}>Submit service to client</button>
        </div>
      </div>
      {showCommentPopup && (
        <div className="comment-popup">
          <div className="popup-content">
            <h3>Comment to Applicant</h3>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Type your comment..."
            />
            <div className="popup-buttons">
              <button className="cancel-button" onClick={() => setShowCommentPopup(false)}>Cancel</button>
              <button className="confirm-button" onClick={handleConfirmComment}>Confirm</button>
            </div>
          </div>
        </div>
      )}
      {showConfirmPopup && (
        <div className="confirm-popup">
          <div className="popup-content">
            <h3>Are you sure you want to submit the selected services to the client?</h3>
            <div className="popup-buttons">
              <button className="cancel-button" onClick={() => setShowConfirmPopup(false)}>Cancel</button>
              <button className="confirm-button" onClick={handleConfirmSubmission}>Confirm</button>
            </div>
          </div>
        </div>
      )}
      {showDocsPopup && (
        <div className="docs-popup">
          <div className="popup-content">
            <h3>Uploaded Documents</h3>
            <ul>
              {uploadedDocs.length > 0 && uploadedDocs.map((docArray, index) => (
                <li key={index}>
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

export default DetailServiceMatching;
