/* eslint-disable react/prop-types */
import { useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { Button, Drawer, Space } from "antd";
import { FaArrowLeftLong } from "react-icons/fa6";
import { MdOutlineFileDownload } from "react-icons/md";
// eslint-disable-next-line react/prop-types
const Details = ({ data }) => {
  // console.log(data);

  const [open, setOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenOrg, setIsOpenOrg] = useState(false);

  const showDrawer = () => {
    setOpen(true);
  };
  const onClose = () => {
    setOpen(false);
  };

  const toggleDetails = () => {
    setIsOpen(!isOpen);
    if (isOpenOrg) {
      setIsOpenOrg(!isOpenOrg);
    }
  };
  const toggleOrg = () => {
    setIsOpenOrg(!isOpenOrg);
    if (isOpen) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <>
      <Button
        type="primary"
        className="text-primary bg-white border-stoke shadow-none hover:text-white hover:bg-primary"
        onClick={showDrawer}
      >
        View
      </Button>
      <Drawer
        extra={<Space></Space>}
        title={
          <>
            <div className="flex gap-3">
              <FaArrowLeftLong
                className=" my-auto hover:bottom-2"
                onClick={onClose}
              />
              <p className=""> Back</p>
            </div>
          </>
        }
        width={370}
        closable={false}
        onClose={onClose}
        open={open}
      >
        <div>
          <div className="bg-bgGray p-3 rounded-lg">
            {/* BUTTON SECTION */}
            <div className="flex justify-between" onClick={toggleDetails}>
              <h2 className="font-semibold text-textBlack">Project details</h2>
              {isOpen ? <FaChevronUp /> : <FaChevronDown />}
            </div>

            {/* DETAIL SECTION */}
            {isOpen && (
              <>
                <div>
                  <div className="h-[1px] my-2 bg-stoke" />
                  <h3 className="font-semibold text-textBlack">{data?.name}</h3>
                  <p className="text-textGray font-sans my-2">
                    <span>{data?.name}:</span> <span>{data?.description}</span>
                  </p>
                  <p className="text-textGray font-sans mt-3">Country</p>
                  <h3 className="font-semibold text-textBlack">
                    {data?.country}
                  </h3>
                </div>
                <div>
                  <div className="h-[1px] my-2 bg-stoke" />
                  <p className="text-textGray font-sans mt-3">Deadline</p>
                  <h3 className="font-semibold text-textBlack">
                    {data?.dateline}
                  </h3>
                </div>
                <div>
                  <div className="h-[1px] my-2 bg-stoke" />
                  <p className="text-textGray font-sans mt-3">
                    GT reference number
                  </p>
                  <h3 className="font-semibold text-textBlack">91093467</h3>
                </div>
                <div>
                  <div className="h-[1px] my-2 bg-stoke" />
                  <p className="text-textGray font-sans mt-3">
                    Product classification
                  </p>
                  <h3 className="font-semibold text-textBlack">
                    Construction work
                  </h3>
                </div>
              </>
            )}
          </div>
          <div className="bg-bgGray p-3 rounded-lg my-3">
            {/* BUTTON SECTION */}
            <div className="flex justify-between" onClick={toggleOrg}>
              <h2 className="font-semibold text-textBlack">
                Organisation Details{" "}
              </h2>
              {isOpenOrg ? <FaChevronUp /> : <FaChevronDown />}
            </div>

            {/* DETAIL SECTION */}
            {isOpenOrg && (
              <>
                <div>
                  <div className="h-[1px] my-2 bg-stoke" />
                  <h3 className="font-semibold text-textBlack">{data?.name}</h3>
                  <p className="text-textGray font-sans my-2">
                    <span>{data?.name}:</span> <span>{data?.description}</span>
                  </p>
                  <p className="text-textGray font-sans mt-3">Country</p>
                  <h3 className="font-semibold text-textBlack">
                    {data?.country}
                  </h3>
                </div>
                <div>
                  <div className="h-[1px] my-2 bg-stoke" />
                  <p className="text-textGray font-sans mt-3">Deadline</p>
                  <h3 className="font-semibold text-textBlack">
                    {data?.dateline}
                  </h3>
                </div>
                <div>
                  <div className="h-[1px] my-2 bg-stoke" />
                  <p className="text-textGray font-sans mt-3">
                    GT reference number
                  </p>
                  <h3 className="font-semibold text-textBlack">91093467</h3>
                </div>
                <div>
                  <div className="h-[1px] my-2 bg-stoke" />
                  <p className="text-textGray font-sans mt-3">
                    Product classification
                  </p>
                  <h3 className="font-semibold text-textBlack">
                    Construction work
                  </h3>
                </div>
              </>
            )}
          </div>
          <div className="bg-bgGray p-3 rounded-lg my-3">
            {/* BUTTON SECTION */}
            <div className="flex justify-between" onClick={toggleOrg}>
              <h2 className="font-semibold text-textBlack">
                Notice Details and document
              </h2>
              <FaChevronDown />
              {/* {isOpenOrg ? <FaChevronUp /> : <FaChevronDown />} */}
            </div>
            <div>
              <div className="h-[1px] my-2 bg-stoke" />
              <p className="text-textGray font-sans my-2">
                Bidding package informationApplicable processBidding lawName of
                bidding packageBidding package TV-02: Geological
                surveyInvestorBTL VÙN 4 HAI QUANInviting
              </p>
              <button className="px-2 py-1 rounded-md w-full  bg-primary">
                <span className="flex justify-center gap-2">
                  <MdOutlineFileDownload className="mt-1" /> Download
                </span>
              </button>
            </div>
          </div>
        </div>
      </Drawer>
    </>
  );
};
export default Details;
