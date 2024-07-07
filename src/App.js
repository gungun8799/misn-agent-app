import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import Login from './components/Login/Login';
import Home from './components/Home/Home';
import Signup from './components/Signup/Signup';
import VerifyEmail from './components/VerifyEmail/VerifyEmail';
import SystemApprove from './components/SystemApprove/system-approve';
import DetailPreApprove from './components/DetailPreApprove/detail-pre-approve.js';
import DetailPreReject from './components/DetailPreReject/detail-pre-reject.js';
import ServiceMatching from './components/ServiceMatching/service-matching.js';
import DetailServiceMatching from './components/DetailServiceMatching/detail-service-matching.js';
import ServiceDelivery from './components/ServiceDelivery/service-delivery.js';
import DetailServiceDelivery from './components/DetailServiceDelivery/detail-service-delivery.js';
import AgentClientChat from './components/AgentClientChat/agent-client-chat.js';
import VisitSchedule from './components/VisitSchedule/visit-schedule.js';
import IssueTicket from './components/IssueTicket/issue-ticket.js';
import DetailIssueTicket from './components/DetailIssueTicket/detail-issue-ticket.js';
import '@fortawesome/fontawesome-free/css/all.min.css';
import ClientProfile from './components/ClientProfile/client-profile.js';
import DetailClientProfile from './components/DetailClientProfile/detail-client-profile.js';
import AgentProfile from './components/AgentProfile/agent-profile.js';
import MyChat from './components/MyChat/my-chat.js';
import BottomBar from './components/BottomBar'; // Import the BottomBar component
import './transition.css';
import { useState } from 'react';

function App() {
  const [direction, setDirection] = useState('forward');

  return (
    <Router>
      <div className="app">
        <AnimatedRoutes direction={direction} setDirection={setDirection} />
        <BottomBar /> {/* Place BottomBar outside the transition group */}
      </div>
    </Router>
  );
}

const AnimatedRoutes = ({ direction, setDirection }) => {
  const location = useLocation();

  return (
    <TransitionGroup>
      <CSSTransition
        key={location.key}
        classNames={direction === 'forward' ? 'page' : 'page-reverse'}
        timeout={300}
      >
        <Routes location={location}>
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/SystemApprove" element={<SystemApprove setDirection={setDirection} />} />
          <Route path="/ServiceMatching" element={<ServiceMatching setDirection={setDirection} />} />
          <Route path="/detail-pre-approve/:applicationId" element={<DetailPreApprove setDirection={setDirection} />} />
          <Route path="/detail-pre-reject/:applicationId" element={<DetailPreReject setDirection={setDirection} />} />
          <Route path="/service-matching" element={<ServiceMatching setDirection={setDirection} />} />
          <Route path="/detail-service-matching/:applicationId" element={<DetailServiceMatching setDirection={setDirection} />} />
          <Route path="/ServiceDelivery" element={<ServiceDelivery setDirection={setDirection} />} />
          <Route path="/detail-service-delivery/:applicationId" element={<DetailServiceDelivery setDirection={setDirection} />} />
          <Route path="/agent-client-chat/:clientId" element={<AgentClientChat setDirection={setDirection} />} />
          <Route path="/visit-schedule/:clientId" element={<VisitSchedule setDirection={setDirection} />} />
          <Route path="/IssueTicket/" element={<IssueTicket setDirection={setDirection} />} />
          <Route path="/detail-issue-ticket/:ticketId" element={<DetailIssueTicket setDirection={setDirection} />} />
          <Route path="/client-profile" element={<ClientProfile setDirection={setDirection} />} />
          <Route path="/detail-client-profile/:clientId" element={<DetailClientProfile setDirection={setDirection} />} />
          <Route path="/AgentProfile" element={<AgentProfile setDirection={setDirection} />} />
          <Route path="/my-chat" element={<MyChat setDirection={setDirection} />} />

        </Routes>
      </CSSTransition>
    </TransitionGroup>
  );
};

export default App;
