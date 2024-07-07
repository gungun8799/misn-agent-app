import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, query, where, getDocs, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import axios from 'axios';
import { FaPhoneAlt, FaArrowLeft, FaFileAlt, FaFilePdf, FaFileUpload, FaMicrophoneAlt } from 'react-icons/fa';
import { IoSparklesSharp } from 'react-icons/io5';
import { CiChat1 } from "react-icons/ci";
import BottomBar from '../BottomBar';
import './detail-pre-approve.css';
import loadingGif from '../../assets/loading.gif'; // Ensure the correct path

const DetailPreApprove = ({ setDirection }) => {
  const { applicationId } = useParams();
  const [applicationData, setApplicationData] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [agentData, setAgentData] = useState({});
  const [selectedProgram, setSelectedProgram] = useState('');
  const [showCommentPopup, setShowCommentPopup] = useState(false);
  const [comment, setComment] = useState('');
  const [statusToChange, setStatusToChange] = useState('');
  const [showDocsPopup, setShowDocsPopup] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [showAICards, setShowAICards] = useState(false);
  const [isAISuggestionLoading, setIsAISuggestionLoading] = useState(false);
  const [recordData, setRecordData] = useState([]);
  const [showRecordPopup, setShowRecordPopup] = useState(false);
  const [showVoiceRecordPopup, setShowVoiceRecordPopup] = useState(false); // New state for voice record popup
  const [voiceRecordData, setVoiceRecordData] = useState([]); // New state for voice record data
  const navigate = useNavigate();

  const LoadingOverlay = () => (
    <div className="loading-overlay">
      <div className="spinner">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>
  );

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
          setSelectedProgram(applicationData.system_suggest_program);
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
        'auto_filled_form_data.final_program_name': selectedProgram,
        'agent_comment.agent_comment_response': arrayUnion(comment)
      });
      alert(`Application ${statusToChange} successfully!`);
      setShowCommentPopup(false);
      setComment('');

      if (statusToChange === 'approved') {
        await appendFormScreeningData(applicationRef, selectedProgram);
        navigate('/SystemApprove');
      }
    } catch (error) {
      console.error('Error updating document:', error);
      alert(`Failed to update application status.`);
    }
  };

  const appendFormScreeningData = async (applicationRef, programName) => {
    try {
      const formScreeningRef = doc(db, 'ProgramForms', programName);
      const formScreeningSnap = await getDoc(formScreeningRef);

      if (formScreeningSnap.exists()) {
        const formData = formScreeningSnap.data();
        await updateDoc(applicationRef, {
          formData
        });
        console.log('Form screening data appended successfully');
      } else {
        console.error('FormScreening document does not exist for the selected program name');
      }
    } catch (error) {
      console.error('Error appending form screening data:', error);
    }
  };

  const handleRequestDocs = () => {
    setStatusToChange('request_docs');
    setShowCommentPopup(true);
  };

  const handleReject = () => {
    setStatusToChange('rejected');
    setShowCommentPopup(true);
  };

  const handleApprove = () => {
    setStatusToChange('approved');
    setShowCommentPopup(true);
  };

  const handleConfirmComment = async () => {
    await handleStatusChange();
  };

  const handleProgramChange = (event) => {
    setSelectedProgram(event.target.value);
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

  const handleSeeFilledForm = async () => {
    try {
      const applicationRef = doc(db, 'Applications', applicationId);
      const applicationSnap = await getDoc(applicationRef);
      if (applicationSnap.exists()) {
        const applicationData = applicationSnap.data();
        const formScreeningData = applicationData.form_screening_data || [];

        setRecordData(formScreeningData);
        setShowRecordPopup(true);
      } else {
        console.error('No such application!');
      }
    } catch (error) {
      console.error('Error fetching form data:', error);
    }
  };

  const handleRecordPopupClose = () => {
    setShowRecordPopup(false);
  };

  const handleVoiceRecordPopup = async () => {
    try {
      const applicationRef = doc(db, 'Applications', applicationId);
      const applicationSnap = await getDoc(applicationRef);
      if (applicationSnap.exists()) {
        const applicationData = applicationSnap.data();
        const voiceRecordData = applicationData.form_screening_data || [];

        setVoiceRecordData(voiceRecordData);
        setShowVoiceRecordPopup(true);
      } else {
        console.error('No such application!');
      }
    } catch (error) {
      console.error('Error fetching voice record data:', error);
    }
  };

  const handleVoiceRecordPopupClose = () => {
    setShowVoiceRecordPopup(false);
  };

  const handleAIBoardSuggestion = async () => {
    try {
      setIsAISuggestionLoading(true);
      const applicationRef = doc(db, 'Applications', applicationId);
      const applicationSnap = await getDoc(applicationRef);
  
      if (applicationSnap.exists()) {
        const applicationData = applicationSnap.data();
        const screeningCriteriaRef = doc(db, 'ScreeningCriteria', 'misn');
        const screeningCriteriaSnap = await getDoc(screeningCriteriaRef);
  
        if (screeningCriteriaSnap.exists()) {
          const screeningCriteriaData = screeningCriteriaSnap.data();
  
          const prompts = [
            `Compare the value in Answer_1: '${applicationData.form_screening_data[0].Answer}' if it is eligible for criteria_1: '${screeningCriteriaData.criteria_1}'. If it is, give the feedback from the most match topic as the following (the topic is the value before the parenthesis): 1) Health Insurance Navigation (Our team helps individuals and families determine if they are eligible for health insurance through the New York State of Health Marketplace in Dutchess, Orange, Putnam, Sullivan and Ulster counties.). 2) Community Health Advocate Services (MiSN’s Community Health Advocates can help you and your family find affordable healthcare if you do not have insurance or access your health insurance benefits!). 3) CAPP Youth Services (Our youth programs help young people to tap into their own inner resources, create meaningful relationships with their peers and adults, and gain the confidence and skills they need for successful transitions to adulthood.). 4) Women's Wellness Services (MiSN's Community Health workers have been trained on women and infant health and can connect you with services, resources, education, informal counseling, social support and advocacy when you need a helping hand.). 5) Perinatal & Lactation Services (Our classes cover what you need to know and do for optimal health and wellness for each of the 3 trimesters of pregnancy and the 4th trimester, after the baby is born.). 6) Healthy Families NY Putnam County (Our Healthy Families New York accredited home visiting program, seeks to improve the health and well-being of infants and children through home-based services delivered by non-profit organizations in local communities.). If it’s not, summarize the reason in 10 words why it’s not eligible.`,
            `Compare the value in Answer_2: '${applicationData.form_screening_data[1].Answer}' if it is eligible for criteria_2: '${screeningCriteriaData.criteria_2}'. If it is, summarize the reason in 10 words why it’s eligible. If it’s not, summarize the reason in 10 words why it’s not.`,
            `Compare the value in Answer_3: '${applicationData.form_screening_data[2].Answer}' if it is eligible for criteria_3: '${screeningCriteriaData.criteria_3}'. If it is, summarize the reason in 10 words why it’s eligible. If it’s not, summarize the reason in 10 words why it’s not.`,
            `Compare the value in Answer_4: '${applicationData.form_screening_data[3].Answer}' if it is eligible for criteria_4: '${screeningCriteriaData.criteria_4}'. If it is, summarize the reason in 10 words why it’s eligible. If it’s not, summarize the reason in 10 words why it’s not.`
          ];
  
          // Log the information being sent to Gemini
          console.log('Sending the following data to Gemini:');
          console.log('Application Data:', applicationData);
          console.log('Screening Criteria:', screeningCriteriaData);
          console.log('Prompts:', prompts);
  
          const response = await axios.post('http://localhost:8000/compare', { prompts });
  
          // Log the response received from Gemini
          console.log('Response received from Gemini:', response.data);
  
          const { reasons, suggestedProgram } = response.data;
  
          await updateDoc(applicationRef, {
            'application_summary': applicationData.form_screening_data[0].Answer,
            'system_suggest_program': suggestedProgram,
            'reason_approve.reason_1': reasons[1],
            'reason_approve.reason_2': reasons[2],
            'reason_approve.reason_3': reasons[3]
          });
  
          setShowAICards(true);
          setApplicationData((prevData) => ({
            ...prevData,
            application_summary: applicationData.form_screening_data[0].Answer,
            reason_approve: {
              reason_1: reasons[1],
              reason_2: reasons[2],
              reason_3: reasons[3]
            },
            system_suggest_program: suggestedProgram
          }));
  
          // Log the final determined value of system_suggest_program
          console.log('Final system_suggest_program:', suggestedProgram);
        } else {
          console.error('ScreeningCriteria document does not exist');
        }
      } else {
        console.error('Application document does not exist');
      }
    } catch (error) {
      console.error('Error fetching AI suggestion:', error);
    } finally {
      setIsAISuggestionLoading(false);
    }
  };
  

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (!applicationData || !clientData) {
    return <div className="error">Application or Client data not found.</div>;
  }

  const filledFormUrl = applicationData?.filled_form;
  const voiceRecordUrl = applicationData?.auto_filled_form_data?.recorded_voice_path;

  const reason_1 = applicationData?.reason_approve?.reason_1;
  const reason_2 = applicationData?.reason_approve?.reason_2;
  const reason_3 = applicationData?.reason_approve?.reason_3;

  const programs = [
    "Insurance Navigation",
    "Healthy families Putnam",
    "CAPP Youth Services",
    "PICHC / Women's Health",
    "Community Health Advocacy",
    "Perinatal & Lactation Services"
  ];

  return (
    <div className="detail-pre-approve">
      <button className="back-button-DPA" onClick={() => navigate(-1)}>
        <FaArrowLeft className="back-icon" /> Back
      </button>
      <div className="content">
        <div className="client-info-DPA">
          {clientData?.profile_photo_url && (
            <div className="client-photo-DPA">
              <img src={clientData.profile_photo_url} alt="Client" />
            </div>
          )}
          <div className="client-name-DPA">
            {clientData?.full_name}
            <button onClick={handleChatWithClient} className="chat-button-DPA"> <CiChat1 /> </button>
            <button className="call-button-DPA" onClick={() => window.open(`tel:${clientData.phoneNumber}`, '_self')}>
              <FaPhoneAlt />
            </button>
          </div>
        </div>
        <div className="basic-info-DPA">
          <h3>Basic Information</h3>
          <p>Application ID: {applicationId}</p>
          <p>Client ID: {clientData?.client_id}</p>
          <p>Phone Number: {clientData?.phoneNumber}</p>
          <p>Email: {clientData?.email}</p>
          <p>County: {clientData?.county}</p>
          <p>Age: {clientData?.age}</p>
          <p>Language Preference: {clientData?.language_preference}</p>
          <p>Nationality: {clientData?.nationality}</p>
        </div>
        <div className="request-summary">
              <h3>Summary of the request</h3>
              <p>{applicationData.application_summary}</p>
            </div>
        <div className="service-request-DPA">
          <h3>Application Detail</h3>
          <button className="service-button-DPM" onClick={handleVoiceRecordPopup}>
            <FaMicrophoneAlt /> Voice record
          </button>
          <button className="service-button-DPM" onClick={handleSeeFilledForm}>
            <FaFileAlt /> See filled form
          </button>
          <button className="service-button-DPM" onClick={handleRequestDocs}>
            <FaFileUpload /> Request Additional docs
          </button>
        </div>
        {isAISuggestionLoading && (
          <div className="loading-overlay">
            <div className="spinner">
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
            </div>
          </div>
        )}
  
        {showAICards && (
          <>

            <div className="animated-card program-reason">
              <h3>AI Evaluation Result</h3>
              <button className="reason-button-approve">📌 {reason_1}</button>
              <button className="reason-button-approve">📌 {reason_2}</button>
              <button className="reason-button-approve">📌 {reason_3}</button>
            </div>
            <div className="animated-card system-suggested-program">
              <h3>AI Pre-matched program</h3>
              {programs.map((program) => (
                <div key={program} className="program-item">
                  <input
                    className="checkbox-item"
                    type="radio"
                    id={program}
                    name="program"
                    value={program}
                    checked={selectedProgram === program || applicationData.system_suggest_program === program}
                    onChange={handleProgramChange}
                  />
                  <label htmlFor={program}>{program}</label>
                </div>
                
              ))}
                     
            </div>
            <div className="action-buttons-DPA">
              <button className="reject-button-DPA" onClick={handleReject}>Reject</button>
              <button className="approve-button-DPA" onClick={handleApprove}>Approve</button>
        </div>
          </>
        )}
  
  <button className="ai-suggestion-button-DPA" onClick={handleAIBoardSuggestion}>
  <IoSparklesSharp className="ai-icon-size"/> AI Onboard Suggestion
</button>

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
              {uploadedDocs.length > 0 && uploadedDocs.map((docUrl, index) => (
                <li key={index}>
                  <a href={docUrl} target="_blank" rel="noopener noreferrer">{`Document ${index + 1}`}</a>
                </li>
              ))}
            </ul>
            <button className="close-button" onClick={handleDocsPopupClose}>Close</button>
          </div>
        </div>
      )}
      {showRecordPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <button className="close-button-2" onClick={handleRecordPopupClose}>X</button>
            <h2>Filled Form Details</h2>
            <div className="popup-scrollable-content">
              {recordData.map((item, index) => (
                <div key={index} className="record-item">
                  <p><strong>Question:</strong> {item.Question}</p>
                  <p><strong>Answer:</strong> {item.Answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {showVoiceRecordPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <button className="close-button-2" onClick={handleVoiceRecordPopupClose}>X</button>
            <h2>Voice Records</h2>
            <div className="popup-scrollable-content">
              {voiceRecordData.map((item, index) => (
                <div key={index} className="record-item">
                  <p><strong>Question:</strong> {item.Question}</p>
                  <audio controls>
                    <source src={item.audio_url} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                  <p><strong>Transcribed Text:</strong> {item.transcribed_text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <BottomBar />
    </div>
  );
};

export default DetailPreApprove;
