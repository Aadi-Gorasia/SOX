import React from 'react';
import {Link} from 'react-router-dom';
import './LegalPage.css';
export function LegalLinks(){return <nav className="legal-links" aria-label="Site policies"><Link to="/cookie-policy">Cookies</Link><span>·</span><Link to="/terms">Terms</Link></nav>}
export default function LegalPage({type}){
 const cookies=type==='cookies';
 return <main className="legal-page"><Link to="/play">← Back to SOX</Link><h1>{cookies?'Cookie Policy':'Terms & Conditions'}</h1><p className="legal-date">Last updated: 25 November 2026</p>
 {cookies?<>
 <p>This policy explains how SOX uses browser storage and analytics. Cookies are small files stored by a website; local storage is a separate browser feature that can keep information between visits.</p>
 <h2>Storage used by SOX</h2>
 <div className="legal-table"><table><thead><tr><th>Item</th><th>Purpose</th><th>Duration</th></tr></thead><tbody>
 <tr><td><code>token</code> (local storage)</td><td>Keeps you signed in by storing your authentication token.</td><td>Removed when you log out or the app rejects an expired or invalid token. You can also clear it in your browser.</td></tr>
 <tr><td><code>site-appearance-pending</code> (local storage)</td><td>Keeps appearance changes for your account while a save is pending or has failed.</td><td>Removed after a successful save, or when you clear site data.</td></tr>
 <tr><td><code>site-theme</code> and <code>site-preferences</code> (local storage)</td><td>Remember your chosen theme and display preferences.</td><td>Remain until replaced or cleared in your browser.</td></tr>
 </tbody></table></div>
 <h2>Analytics</h2><p>SOX uses Vercel Web Analytics to understand visits and page usage. Vercel describes this service as cookie-free; it uses request-derived identifiers that are discarded after 24 hours. It may process page URLs, referrers, approximate location, and browser or device information for aggregate reports. See <a href="https://vercel.com/docs/analytics/privacy-policy" target="_blank" rel="noreferrer">Vercel’s Web Analytics privacy documentation</a>.</p>
 <h2>Other services</h2><p>If you choose a third-party sign-in provider, that provider may use its own cookies and storage on its services. Its own privacy and cookie policies apply. SOX does not currently include advertising cookies.</p>
 <h2>Your choices</h2><p>You can inspect or clear SOX’s cookies and site data in your browser settings. Clearing local storage signs you out and resets saved display preferences. Blocking storage may prevent sign-in or preferences from working. Logging out removes the sign-in token but does not delete your account or saved games.</p>
 <h2>Questions and updates</h2><p>We will update this page if these practices change. For questions about SOX storage, contact <a href="mailto:aadi.gorasia6@gmail.com">aadi.gorasia6@gmail.com</a>.</p>
 </>:<>
 <p>These terms apply to your use of SOX, an online Ultimate Tic-Tac-Toe game operated by Aadi Gorasia. By using SOX, you agree to these terms. If you do not agree, please stop using the service.</p>
 <h2>Accounts</h2><p>Provide accurate account information, protect your login credentials, and use only accounts you are authorised to access. You are responsible for activity on your account. If you are below the age at which you can agree to these terms in your location, use SOX only with a parent or guardian’s permission and supervision.</p>
 <h2>Fair play and acceptable use</h2><p>Do not cheat, use unauthorised assistance in competitive matches, manipulate ratings, exploit bugs, disrupt the service, impersonate others, or send abusive, unlawful, or harassing content. Engine assistance is intended for computer practice, puzzles, and completed-game review. We may restrict accounts involved in misuse and correct results affected by technical faults or abuse.</p>
 <h2>Games, ratings, and analysis</h2><p>Ratings are measures used within SOX. Bot Elo labels are approximate difficulty settings, not independently calibrated ratings. Reviews and coaching reflect limited engine searches and can be incomplete or incorrect; they do not guarantee optimal play. Computer practice does not change your competitive rating. Connectivity failures, maintenance, or software errors can interrupt games.</p>
 <h2>Your content and game records</h2><p>You retain any rights you have in content you submit. You give SOX permission to store, process, and display that content as needed to operate the service, including match histories, profiles, and chat. Do not submit content you have no right to share. Account information and game records are stored to provide gameplay, ratings, and reviews.</p>
 <h2>Service and intellectual property</h2><p>SOX’s branding and original materials remain the property of their respective owners. You may use the service for personal play and practice. Do not misrepresent ownership or bypass access controls. Third-party and open-source components remain subject to their own licences.</p>
 <h2>Availability and responsibility</h2><p>SOX is provided as available. To the extent permitted by applicable law, we do not promise uninterrupted availability, error-free analysis, or preservation of every game record. We are not responsible for indirect losses caused by using the service. Nothing in these terms excludes responsibilities or rights that cannot legally be excluded, including applicable consumer rights.</p>
 <h2>Third-party services and browser storage</h2><p>Hosting, analytics, and optional sign-in providers have their own terms and policies. Our <Link to="/cookie-policy">Cookie Policy</Link> explains the browser storage and analytics used by SOX.</p>
 <h2>Changes, account requests, and contact</h2><p>We may update features and these terms. Material changes will be indicated on this page with an updated date. Stop using SOX if you do not accept revised terms. For account requests, complaints, or questions, contact <a href="mailto:aadi.gorasia6@gmail.com">aadi.gorasia6@gmail.com</a>. These terms do not remove any mandatory protections provided by the laws that apply to you.</p>
 </>}
 </main>;
}
