import { useEffect } from "react";
import { Link } from "react-router-dom";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import logo from "../assets/logo.png";

/**
 * ProjectNoAccess Component
 * Friendly landing page for users trying to access project URLs without authentication
 * Provides clean call-to-action for login or registration
 */
const ProjectNoAccess = () => {
  useEffect(() => {
    // Set page title
    document.title = "Access Required - All Roof Take-offs";
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-20 rounded-xl shadow-lg w-full max-w-md mx-auto">
        <div className="py-4 flex flex-col justify-center mx-auto w-full">
          <div className="w-full text-center">
            <img src={logo} className="w-48 mx-auto" alt="Logo" />
            <div className="my-6">
              <div className="flex justify-center mb-4">
                <LockOutlined className="text-6xl text-primary" />
              </div>
              <h2 className="text-smallBold text-textBlack mb-2">Whoops! Access Required</h2>
              <p className="text-textGray text-semiBold mb-2">
                You need to be logged in to view project details and estimates.
              </p>
              <p className="text-textGray text-sm">
                Don't have an account? No worries - registration is quick and easy!
              </p>
              <p className="text-textGray text-sm">
                You can be live in under 60s.
              </p>
            </div>
          </div>

          <div className="flex flex-col space-y-4">
            <Link
              to="/login?noaccess=true"
              className="w-full bg-primary text-white font-semibold py-3 rounded-md text-center hover:bg-primary-dark transition-colors flex items-center justify-center"
            >
              <LockOutlined className="mr-2" />
              Sign In
            </Link>
            
            <Link
              to="/register?noaccess=true"
              className="w-full bg-gray-200 text-gray-700 font-semibold py-3 rounded-md text-center hover:bg-gray-300 transition-colors flex items-center justify-center"
            >
              <span className="mr-2">+</span>
              Create Account
            </Link>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-textGray mb-3">Need help? Contact us</p>
            <div className="flex justify-center space-x-4">
              <a 
                href="mailto:requests@allrooftakeoffs.com.au" 
                className="text-primary text-sm flex items-center hover:underline"
              >
                <MailOutlined className="mr-1" />
                Email
              </a>
              <a 
                href="https://wa.me/61438399983" 
                className="text-primary text-sm flex items-center hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                � WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-center">
        <p className="text-textGray text-sm">
          All Roof Take-offs - Professional Roof Takeoff Services
        </p>
      </div>
    </div>
  );
};

export default ProjectNoAccess;
