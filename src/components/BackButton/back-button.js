import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import './back-button.css';

const BackButton = ({ marginLeft = '-280px', marginBottom = '10px', color = '#118881', fontSize = '1em' }) => {
  const navigate = useNavigate();

  return (
    <button
      className="back-button-component"
      style={{ marginLeft, marginBottom, color, fontSize }}
      onClick={() => navigate(-1)}
    >
      <FaArrowLeft className="back-icon-component" /> Back
    </button>
  );
};

export default BackButton;
