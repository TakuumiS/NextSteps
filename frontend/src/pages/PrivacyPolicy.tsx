import React from 'react';

export default function PrivacyPolicy() {
    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            <h1>Privacy Policy for NextSteps</h1>
            <p>Last updated: December 30, 2025</p>

            <h2>1. Introduction</h2>
            <p>
                NextSteps ("we," "our," or "us") respects your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use our job application tracking application (the "Service").
            </p>

            <h2>2. Information We Collect</h2>
            <p>
                <strong>Google User Data:</strong> We access your Google profile (name, email, profile picture) and Gmail messages (read-only) to identify job application updates.
                We only process emails related to job applications.
            </p>

            <h2>3. How We Use Your Information</h2>
            <ul>
                <li>To provide and maintain the Service.</li>
                <li>To scan your emails for job application statuses (Applied, Interview, Offer, Rejected).</li>
                <li>To display your job application board and analytics.</li>
            </ul>

            <h2>4. Data Storage and Security</h2>
            <p>
                We store your application data securely. We do not sell your personal data.
                Your Google Access Tokens are used only for the purpose of scanning emails initiated by you.
            </p>

            <h2>5. Limited Use Policy</h2>
            <p>
                NextSteps's use and transfer to any other app of information received from Google APIs will adhere to <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.
            </p>

            <h2>6. Contact Us</h2>
            <p>
                If you have any questions about this Privacy Policy, please contact us.
            </p>

            <p style={{ marginTop: '2rem' }}>
                <a href="/">Back to Home</a>
            </p>
        </div>
    );
}
