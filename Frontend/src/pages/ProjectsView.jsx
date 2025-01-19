import { Button } from "antd";
import { useEffect, useRef, useState } from "react";
import { FaArrowLeftLong } from "react-icons/fa6";
import { Link, useParams } from "react-router-dom";
import useAxiosSecure from "../hooks/AxoisSecure/useAxiosSecure";
import UploadFile from "../Components/UploadFile";
import { MdOutlineFileDownload } from "react-icons/md";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const ProjectsView = () => {
  const [project, setProjet] = useState({});
  const { id } = useParams();
  const axiosSecure = useAxiosSecure();
  const componentRef = useRef(); // Reference to the component for PDF generation

  // const { user } = useContext(AuthContext);

  // const isAdmin = user?.role === "Admin";

  const url = `/get-project/${id}`;
  useEffect(() => {
    axiosSecure
      .get(url)
      .then((res) => {
        setProjet(res.data.data);
      })
      .catch((err) => {
        console.log(err);
      });
  }, [axiosSecure, url]);

  const handleDownloadAll = () => {
    project?.files?.forEach((file) => {
      if (file?.downloadableLink) {
        const link = document.createElement("a");
        link.href = file.downloadableLink;
        link.download = file.fileName || "downloaded-file";
        link.click();
      }
    });
  };

  const handleDownloadPDF = async () => {
    const element = componentRef.current;

    // Generate canvas from the component
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    // Initialize jsPDF
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Calculate the height of the rendered canvas in the PDF
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight; // Remaining height to render
    let position = 0; // Y offset

    // Add the image to the PDF, splitting it across multiple pages if necessary
    while (heightLeft > 0) {
      pdf.addImage(
        imgData,
        "PNG",
        0,
        position,
        imgWidth,
        Math.min(imgHeight, pdfHeight)
      );
      heightLeft -= pdfHeight; // Decrease the height left to render
      position -= pdfHeight; // Adjust the Y position for the next page

      if (heightLeft > 0) {
        pdf.addPage(); // Add a new page if more content remains
        position = 0; // Reset position for the new page
      }
    }

    pdf.save(`${project?.name || "Project_Details"}.pdf`);
  };

  return (
    <div className="min-h-screen pb-4">
      <div className="flex justify-between">
        <div>
          <p className="flex gap-3 my-3 ">
            <Link to="/">
              <FaArrowLeftLong className="text-2xl text-textGray" />{" "}
            </Link>
            Project View
          </p>
        </div>
        <div className="my-auto">
          <button
            className="px-2 py-1 rounded-md border-2 border-primary"
            onClick={handleDownloadPDF}
          >
            <span className="flex gap-2">
              <MdOutlineFileDownload className="mt-1" /> Download
            </span>
          </button>
        </div>
      </div>
      <div className="" ref={componentRef}>
        {/* 1st row  */}
        <div className="w-full p-4 bg-white rounded-lg">
          <h2 className="text-xl font-medium">{project?.name}</h2>
          <p className="my-1">Project name</p>
        </div>
        {/* 2nd row  */}
        <div className="flex flex-wrap my-6 gap-4">
          <div className="flex-1 min-w-[250px] bg-white p-4 rounded-lg">
            <p className="text-sm md:text-base lg:text-lg text-gray-500">
              Location
            </p>
            <h3 className="text-lg md:text-xl lg:text-2xl font-medium text-gray-800">
              {project?.location}
            </h3>
          </div>

          <div className="flex-1 min-w-[250px] bg-white p-4 rounded-lg">
            <p className="text-sm md:text-base lg:text-lg text-gray-500">
              Deadline Date
            </p>
            <h3 className="text-lg md:text-xl lg:text-2xl font-medium text-gray-800">
              {project?.dateline}
            </h3>
          </div>

          <div className="flex-1 min-w-[250px] bg-white p-4 rounded-lg">
            <p className="text-sm md:text-base lg:text-lg text-gray-500">
              My Details
            </p>
            <h3 className="text-lg md:text-xl lg:text-2xl font-medium text-gray-800">
              {project?.onarDetail?.userName}
            </h3>
            <h3 className="text-lg md:text-xl lg:text-2xl font-medium text-gray-800">
              {project?.onarDetail?.userEmail}
            </h3>
            <h3 className="text-lg md:text-xl lg:text-2xl font-medium text-gray-800">
              {project?.onarDetail?.userPhone}
            </h3>
            <h3 className="text-lg md:text-xl lg:text-2xl font-medium text-gray-800">
              {project?.onarDetail?.userAddress}
            </h3>
          </div>
        </div>
        {/* 3rd row  */}
        <div className="flex flex-col h-fit gap-y-4 gap-x-4 md:flex-row">
          <div className="flex-1 bg-white p-4 rounded-md">
            <>
              <div className="flex justify-between mb-4">
                <p className="text-textGray">File and attachment</p>
                {project?.files?.length > 0 && (
                  <Button
                    className="bg-transparent border-primary text-primary"
                    onClick={handleDownloadAll}
                  >
                    Download all
                  </Button>
                )}
              </div>
              {project?.files?.length > 0 ? (
                <div>
                  {project.files.map((file, index) => (
                    <div
                      key={index}
                      className="flex h-fit justify-between pb-1"
                    >
                      <p className="text-textGray my-auto">
                        {file?.fileName || "Attached file"}
                      </p>
                      <Button className="bg-transparent border-primary text-primary">
                        <a
                          href={`${file?.downloadableLink}`}
                          rel="noopener noreferrer"
                          target="_self"
                        >
                          Download
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32">
                  <p className="text-lg text-gray-500">File not attached yet</p>
                </div>
              )}
            </>
            <UploadFile projectId={id} />
            {/* {isAdmin && <UploadFile projectId={id} />} */}
          </div>

          <div className="flex-1 space-y-4">
            <div className="bg-white p-4 rounded-md">
              <h4>Job detail</h4>
              <p>{project?.description}</p>
            </div>
            <div className="text-textGray bg-white p-4 rounded-md">
              <h3 className="my-2">Builder Details</h3>
              <div className="flex justify-between">
                <p>Sub Total</p>
                <p>{project?.subTotal}</p>
              </div>
              <div className="flex justify-between">
                <p>GST</p>
                <p>{project?.gst}</p>
              </div>
              <div className="h-[2px] bg-black"></div>
              <div className="flex justify-between text-textBlack font-semibold">
                <h2>Total</h2>
                <p>{project?.total}</p>
              </div>
            </div>
          </div>
        </div>
        {/* <FileUpload projectId={id} /> */}
      </div>
    </div>
  );
};

export default ProjectsView;
