import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, query, where, getDocs, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import TopBar from '../TopBar';
import BottomBar from '../BottomBar';
import { FaPhoneAlt, FaArrowLeft } from 'react-icons/fa';
import { CiChat1 } from "react-icons/ci";
import './detail-pre-reject.css';


const DetailPreReject = ({ setDirection }) => {
  const { applicationId } = useParams();
  const [applicationData, setApplicationData] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [agentData, setAgentData] = useState({});
  const [showCommentPopup, setShowCommentPopup] = useState(false);
  const [comment, setComment] = useState('');
  const [statusToChange, setStatusToChange] = useState('');
  const [showDocsPopup, setShowDocsPopup] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const navigate = useNavigate();
  const [visitStatuses, setVisitStatuses] = useState([]); // Add state for visit statuses


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

        const visitsQuery = query(collection(db, 'Visits'), where('applicationId', '==', applicationId));
        const visitsSnapshot = await getDocs(visitsQuery);
        const statuses = visitsSnapshot.docs.map(doc => ({
          timestamp: doc.data().timestamp,
          status: doc.data().status
        }));
        setVisitStatuses(statuses);


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
      navigate(-1); // Navigate to the previous page

    } catch (error) {
      console.error('Error updating document:', error);
      alert(`Failed to update application status.`);
    }

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

  const handleRequestDocs = () => {
    setStatusToChange('request_docs');
    setShowCommentPopup(true);
    
  };

  const handleReject = () => {
    setStatusToChange('handled_by_agent');
    setShowCommentPopup(true);
  };

  const handleApprove = () => {
    setStatusToChange('approved');
    setShowCommentPopup(true);
  };

  const handleConfirmComment = async () => {
    await handleStatusChange();
  };

  const handleDocsPopupOpen = () => {
    setShowDocsPopup(true);
  };

  const handleDocsPopupClose = () => {
    setShowDocsPopup(false);
  };

  const handleTimeslotClick = (timestamp) => {
    navigate('/visit-schedule/undefined', { state: { preselectedDate: timestamp.toDate() } });
  };

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (!applicationData || !clientData) {
    return <div className="error">Application or Client data not found.</div>;
  }

  const filledFormUrl = applicationData?.filled_form;
  const voiceRecordUrl = applicationData?.auto_filled_form_data?.recorded_voice_path;

  const reason_1 = applicationData?.reason_reject?.reason_1;
  const reason_2 = applicationData?.reason_reject?.reason_2;
  const reason_3 = applicationData?.reason_reject?.reason_3;

  return (
    <div className="detail-pre-reject">
      <button className="back-button-DPA" onClick={() => navigate(-1)}>
        <FaArrowLeft className="back-icon" /> Back
      </button>
      <div className="content">
        <div className="client-info-DPR">
          {clientData?.profile_photo_url && (
            <div className="client-photo-DPR">
              <img src={clientData.profile_photo_url} alt="Client" />
            </div>
          )}
          <div className="client-name-DPR">
            {clientData?.full_name}
            <button onClick={handleChatWithClient} className="chat-button-DPR"> <CiChat1 /> </button>
            <button className="call-button-DPR" onClick={() => window.open(`tel:${clientData.phoneNumber}`, '_self')}>
              <FaPhoneAlt />
            </button>
          </div>
        </div>
        <div className="request-summary">
          <h3>Summary of the request</h3>
          <p>{applicationData.application_summary}</p>
        </div>
        <div className="program-reason">
          <h3>Reason of rejection</h3>
          <button className="reason-button"> ⚠️ {reason_1}</button>
          <button className="reason-button">⚠️ {reason_2}</button>
          <button className="reason-button">⚠️ {reason_3}</button>
        </div>
        <div className="basic-info-DPR">
          <h3>Basic Information</h3>
          <p>Client ID: {clientData?.client_id}</p>
          <p>Phone Number: {clientData?.phoneNumber}</p>
          <p>Email: {clientData?.email}</p>
          <p>County: {clientData?.county}</p>
          <p>Age: {clientData?.age}</p>
          <p>Language Preference: {clientData?.language_preference}</p>
          <p>Nationality: {clientData?.nationality}</p>
        </div>
        <div className="service-request-DPR">
          <h3>Service Request</h3>
          <button className="service-button" onClick={() => window.open(voiceRecordUrl, '_blank')}>See full record</button>
          <button className="service-button" onClick={() => window.open(filledFormUrl, '_blank')}>See filled form</button>
          {/* <button className="service-button" onClick={handleDocsPopupOpen}>See uploaded docs</button> */}
        </div>
        <div className="timestamps-list-DPR">
          <h3>Client Available Timeslots</h3>
          <ul>
            {applicationData.agent_contact_back?.timestamps?.map((timestamp, index) => (
              <li key={index} onClick={() => handleTimeslotClick(timestamp)}>
                {timestamp.toDate().toLocaleString()} 
              </li>
            ))}
          </ul>
        </div>
        <div className="action-buttons-DPR">
          <button className="reject-button-DPR" onClick={handleReject}>Done</button>
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
              {statusToChange === 'rejected' ? (
                <button className="confirm-reject-button" onClick={handleConfirmComment}>Reject</button>
              ) : (
                <button className="confirm-button" onClick={handleConfirmComment}>Confirm</button>
              )}
            </div>
          </div>
        </div>
      )}
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

export default DetailPreReject;
