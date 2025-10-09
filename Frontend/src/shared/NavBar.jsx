import { CiBellOn } from "react-icons/ci";
import { HiDotsVertical } from "react-icons/hi";
import logo from "../assets/logo.png";
import bugReportIcon from "/bug-report.svg";
import { Link, useLocation } from "react-router-dom";
import ProfileDrawer from "../components/ProfileDrawer";
import { IoIosMenu } from "react-icons/io";
import { Drawer, Modal, Form, Input, Button, message, Select } from "antd";
import { useContext, useState } from "react";
import { AuthContext } from "../auth/AuthProvider";
import Avatar from "./Avatar"; // Adjust path if necessary
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";

const NavBar = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [bugReportModalOpen, setBugReportModalOpen] = useState(false);
  const [bugReportForm] = Form.useForm();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const axiosSecure = useAxiosSecure();

  const showDrawer = () => setOpen(true);
  const onClose = () => setOpen(false);

  const { user } = useContext(AuthContext);
  const role = user?.role;
  const isAdmin = role === "Admin";
  const isEstimator = role === "Estimator";
  const isUser = role === "User";

  const getProjectsPath = () => {
    // All roles now use the unified projects view with role-based filtering
    return "/projects";
  };

  const navLinks = [
    {
      name: "Job Board",
      path: "/job-board",  // Both Admin and Estimator use same job board
      show: isAdmin || isEstimator,
    },
    {
      name: "Projects",
      path: getProjectsPath(),
      show: !!role,
      activeMatch: "/projects",
    },
    {
      name: "Invoices",
      path: "/invoices",
      show: isAdmin, // Only show to Admins for now
    },
    {
      name: "Clients",
      path: "/clients",
      show: isAdmin, // Only show to Admins, hide from Estimators
    },
    {
      name: "User Management",
      path: "/user-management",
      show: isAdmin,
    },
  ];

  // Bug report categories and subcategories
  const bugCategories = {
    "Page Loading Issues": [
      "Page won't load at all",
      "Page loads very slowly", 
      "Page loads but looks broken",
      "Getting error messages when loading"
    ],
    "Button/Link Problems": [
      "Button doesn't work when clicked",
      "Link goes to wrong page",
      "Button is missing or hidden",
      "Button looks weird or broken"
    ],
    "Data/Information Issues": [
      "My data is missing",
      "Wrong information is showing",
      "Can't save my changes",
      "Data from yesterday is gone"
    ],
    "Login/Access Problems": [
      "Can't log in",
      "Getting logged out automatically", 
      "Don't have access to something I should",
      "Password reset isn't working"
    ],
    "Visual/Display Problems": [
      "Text is overlapping or cut off",
      "Colors/styling looks wrong",
      "On mobile it looks broken",
      "Images won't show up"
    ],
    "Email/Notification Issues": [
      "Not receiving emails I should get",
      "Getting too many emails",
      "Email content looks wrong",
      "Notification settings not working"
    ],
    "Something Else": [
      "Performance is very slow",
      "Feature request/suggestion", 
      "General feedback",
      "Other technical issue"
    ]
  };

  const handleBugReport = () => {
    setBugReportModalOpen(true);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setSelectedSubcategory(null);
    bugReportForm.setFieldsValue({ subcategory: undefined });
  };

  const handleSubcategoryChange = (subcategory) => {
    setSelectedSubcategory(subcategory);
  };

  const handleBugReportSubmit = async (values) => {
    try {
      const bugReportData = {
        category: values.category,
        subcategory: values.subcategory,
        description: values.description,
        userInfo: {
          role: user?.role || 'Unknown',
          email: user?.email || 'Unknown',
          name: user?.name || 'Unknown',
          currentPage: location.pathname,
          browser: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      };

      // Send bug report to backend
      await axiosSecure.post('/support/bug-report', bugReportData);
      
      message.success('Bug report submitted! We\'ll look into this right away. Thank you! 🐛');
      setBugReportModalOpen(false);
      bugReportForm.resetFields();
      setSelectedCategory(null);
      setSelectedSubcategory(null);
    } catch (error) {
      console.error('Error submitting bug report:', error);
      message.error('Oops! Failed to submit bug report. Please try again.');
    }
  };

  const handleBugReportCancel = () => {
    setBugReportModalOpen(false);
    bugReportForm.resetFields();
    setSelectedCategory(null);
    setSelectedSubcategory(null);
  };


  const renderLink = (link) => (
    <li key={link.name}>
      <Link
        to={link.path}
        className={`${
          location.pathname.startsWith(link.path)
            ? "underline font-bold text-textBlack"
            : ""
        }`}
      >
        {link.name}
      </Link>
    </li>
  );

  return (
    <div className="w-full bg-gray-100">
      {/* Large and medium devices */}
      <nav className="hidden md:flex lg:flex justify-between py-2 bg-gray-100 w-full mx-auto px-6">
        <div className="flex items-center gap-3">
          <a href="https://www.allrooftakeoffs.com" target="_blank" rel="noopener noreferrer">
            <img src={logo} alt="Logo" className="stable-image" />
          </a>
          <div className="text-xl font-bold text-gray-800">
            Project Manager <span className="text-orange-600 font-semibold">(BETA)</span>
          </div>
        </div>

        <div className="stable-flex text-textGray navbar-content">
          <ul className="flex gap-4 text-semiBold items-center">
            {navLinks.filter((link) => link.show).map((link) => renderLink(link))}
          </ul>
        </div>

        <div className="flex items-center gap-3">
          <ProfileDrawer>
            <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm cursor-pointer">
              <Avatar
                key={user?.avatar} // 🔥 force re-render when avatar changes
                name={user?.company || user?.name}
                avatarUrl={user?.avatar}
                size="lg"
              />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-800">
                  {user?.company || user?.name}
                </span>
                <span className="text-xs text-gray-500">{user?.email}</span>
              </div>
              <HiDotsVertical className="ml-auto text-gray-400" />
            </div>
          </ProfileDrawer>
        </div>
      </nav>

      {/* Small devices */}
      <nav className="flex justify-between items-center p-2 md:hidden lg:hidden bg-gray-100 w-full px-2 sm:px-4 min-h-[60px]">
        <div className="flex-shrink-0">
          <IoIosMenu onClick={showDrawer} className="text-2xl cursor-pointer" />
          <Drawer 
            title="Menu" 
            placement="right" 
            width={typeof window !== 'undefined' ? Math.min(300, window.innerWidth * 0.8) : 300}
            onClose={onClose} 
            open={open}
          >
            <div className="h-fit text-center gap-6 text-textGray">
              <ul className="text-semiBold space-y-4">
                {navLinks.filter((link) => link.show).map((link) => renderLink(link))}
              </ul>
            </div>
          </Drawer>
        </div>

        <div className="flex-shrink-0 flex justify-center flex-1 max-w-[120px] sm:max-w-[140px]">
          <a href="https://www.allrooftakeoffs.com" target="_blank" rel="noopener noreferrer">
            <img src={logo} alt="Logo" className="w-24 sm:w-32 h-auto object-contain" />
          </a>
        </div>

        <div className="flex gap-2 sm:gap-3 h-fit items-center flex-shrink-0">
          <button className="flex-shrink-0">
            <CiBellOn className="w-8 h-8 sm:w-10 sm:h-10 p-1.5 sm:p-2 border-2 border-gray-400 rounded-full" />
          </button>
          <div className="flex-shrink-0">
            <ProfileDrawer />
          </div>
        </div>
      </nav>

      {/* Persistent Floating Bug Report Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <style>{`
          @keyframes rotate-text {
            from { 
              transform: rotate(0deg); 
            }
            to { 
              transform: rotate(360deg); 
            }
          }
          .rotating-text {
            animation: rotate-text 15s linear infinite;
            transform-origin: 40px 40px;
          }
        `}</style>
        
        <div className="relative">
          {/* Circular Text */}
          <svg className="absolute inset-0 w-20 h-20 -translate-x-3 -translate-y-3">
            <defs>
              <path
                id="circle-path"
                d="M 40,40 m -32,0 a 32,32 0 1,1 64,0 a 32,32 0 1,1 -64,0"
              />
            </defs>
            <g className="rotating-text">
              <text className="text-xs font-bold fill-gray-700">
                <textPath href="#circle-path" startOffset="0%">
                  REPORT-A-BUG • REPORT-A-BUG • 
                </textPath>
              </text>
            </g>
          </svg>
          
          {/* Central Button */}
          <button
            onClick={handleBugReport}
            className="group relative flex items-center justify-center w-14 h-14 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <img src={bugReportIcon} alt="Bug Report" className="w-7 h-7 filter brightness-0 invert" />
            
            {/* Tooltip */}
            <div className="absolute right-16 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
              Report a Bug (BETA)
              <div className="absolute top-1/2 right-0 transform translate-x-1 -translate-y-1/2 w-0 h-0 border-l-4 border-l-gray-800 border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
            </div>
          </button>
        </div>
      </div>

      {/* Bug Report Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <img src={bugReportIcon} alt="Bug Report" className="w-5 h-5" />
            <span>Report a Bug (BETA)</span>
          </div>
        }
        open={bugReportModalOpen}
        onCancel={handleBugReportCancel}
        footer={null}
        width={600}
      >
        <Form
          form={bugReportForm}
          layout="vertical"
          onFinish={handleBugReportSubmit}
          className="mt-4"
        >
          <Form.Item
            name="category"
            label="What type of problem are you having?"
            rules={[{ required: true, message: 'Please select what type of problem this is' }]}
          >
            <Select
              placeholder="Choose the category that best describes your issue"
              size="large"
              onChange={handleCategoryChange}
            >
              {Object.keys(bugCategories).map(category => (
                <Select.Option key={category} value={category}>
                  {category}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {selectedCategory && (
            <Form.Item
              name="subcategory"
              label="Which of these best describes your specific issue?"
              rules={[{ required: true, message: 'Please select the specific issue' }]}
            >
              <Select
                placeholder="Choose the specific issue"
                size="large"
                onChange={handleSubcategoryChange}
              >
                {bugCategories[selectedCategory].map(subcategory => (
                  <Select.Option key={subcategory} value={subcategory}>
                    {subcategory}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item
            name="description"
            label="Tell us more details (optional but helpful!)"
            rules={[{ required: false }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Help us reproduce this issue:&#10;• What were you trying to do?&#10;• What did you click on?&#10;• What happened that was wrong?&#10;• Any error messages you saw?&#10;&#10;The more details you give us, the faster we can fix it! 🔧"
            />
          </Form.Item>

          <div className="bg-blue-50 p-3 rounded mb-4 text-sm text-gray-700">
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">ℹ️</span>
              <div>
                <strong>We automatically include:</strong> Your name, role, current page, and timestamp to help us investigate the issue faster.
              </div>
            </div>
          </div>

          <Form.Item className="mb-0">
            <div className="flex gap-2 justify-end">
              <Button onClick={handleBugReportCancel} size="large">
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large"
                className="bg-red-500 hover:bg-red-600"
                disabled={!selectedCategory}
              >
                🐛 Submit Bug Report
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NavBar;
