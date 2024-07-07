import React from 'react';
import { useNavigate } from 'react-router-dom';
import './TopBar.css';
import logo from '../assets/misn-logo-Photoroom.png';

const TopBar = ({ photoURL, displayName, setDirection }) => {
  const navigate = useNavigate();

  const handleBackClick = () => {
    setDirection('backward'); // Set direction to backward before navigating
    navigate(-1); // Go back to the previous page
  };

  return (
    <div className="top-bar">
      <div className="left-section">
        <img src={logo} alt="MiSN Logo" className="misn-logo" />
      </div>
      <div className="right-section">
        <img src={photoURL} alt="Agent" className="agent-photo" />
      </div>
    </div>
  );
};

export default TopBar;
