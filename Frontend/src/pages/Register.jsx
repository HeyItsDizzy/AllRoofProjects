import authImg from "../assets/auth.png";
import logo from "../assets/logo.png";
import { Input, Checkbox } from "antd";
import { useState } from "react";
import { Link } from "react-router-dom";
import useAxiosPublic from "../hooks/AxiosPublic/useAxiosPublic";
import Swal from "sweetalert2";

const register = () => {
  const [passErr, setPassErr] = useState("");
  const [resError, setResError] = useState({});
  const [isAgreed, setIsAgreed] = useState(false);
  const axiosPublic = useAxiosPublic();
  const url = "/register";

  const handelregister = (e) => {
    e.preventDefault();

    const form = e.target;
    const name = form.name.value;
    const email = form.email.value;
    const address = form.address.value;
    const phone = form.phone.value;
    const org = form.org.value;
    const password = form.password.value;
    const reTypePassword = form.reTypePassword.value;

    if (password !== reTypePassword) {
      setPassErr("Re-type correct password");
      return;
    }

    const userData = {
      name,
      email,
      address,
      phone,
      org,
      password,
    };

    axiosPublic
      .post(url, userData)
      .then((res) => {
        if (res.data.success === false) {
          setResError({ message: res.data.message });
          return;
        }
        form.reset();
        Swal.fire({
          position: "top-end",
          icon: "success",
          title: "Register successful, Login please",
          showConfirmButton: false,
          timer: 1500,
        });
      })
      .catch((err) => {
        console.error(err);
        setResError({ message: err.message });
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: err.message || "Something went wrong!",
        });
      });
  };

  const onChange = (e) => {
    setIsAgreed(e.target.checked);
  };

  return (
    <div className="h-fit flex flex-col-reverse md:flex-row ">
      <div className="flex items-center justify-center">
        <img src={authImg} className="h-full" alt="Auth image" />
      </div>
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-xs mx-auto">
          <img src={logo} className="w-32" alt="Logo" />
          <div className="my-3">
            <h2 className="text-smallBold text-textBlack">
              Create an account!
            </h2>
            <p className="text-textGray text-semiBold">
              Enter your details to create account.
            </p>
          </div>
        </div>
        <form className="w-full max-w-xs mx-auto" onSubmit={handelregister}>
          {resError?.message && alert(resError.message)}
          <div className="flex flex-col mb-4">
            <label className="mb-2 text-semiBold">Name</label>
            <Input name="name" required placeholder="Enter your name" />
          </div>
          <div className="flex flex-col mb-4">
            <label className="mb-2 text-semiBold">Email</label>
            <Input name="email" required placeholder="Enter your email" />
          </div>
          <div className="flex flex-col mb-4">
            <label className="mb-2 text-semiBold">Address</label>
            <Input name="address" required placeholder="Enter your address" />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col mb-4">
              <label className="mb-2 text-semiBold">Phone</label>
              <Input name="phone" required placeholder="Enter your phone" />
            </div>
            <div className="flex flex-col mb-4">
              <label className="mb-2 text-semiBold">Org</label>
              <Input
                name="org"
                required
                placeholder="Enter your organization"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col mb-4">
              <label className="mb-2 text-semiBold">Password</label>
              <Input.Password
                name="password"
                required
                placeholder="Enter your password"
              />
            </div>
            <div className="flex flex-col mb-4">
              <label className="mb-2 text-semiBold">Retype Password</label>
              <Input.Password
                name="reTypePassword"
                required
                placeholder="Re-enter your password"
                onChange={() => setPassErr("")}
              />
            </div>
          </div>
          {passErr && <p className="text-red-500">{passErr}</p>}
          <div>
            <Checkbox onChange={onChange}>
              By clicking create account button, you agree to our{" "}
              <span className="text-semiBold">
                <a href="#">Terms and Conditions</a>
              </span>{" "}
              and{" "}
              <span className="text-semiBold">
                <a href="#">Privacy Policy</a>
              </span>
              .
            </Checkbox>
          </div>
          <button
            disabled={!isAgreed}
            className={`w-full bg-primary text-white font-semibold py-2 rounded-md ${
              !isAgreed ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            Create account
          </button>
        </form>
        <p className="text-blue-400 underline mt-4">
          <Link to="/login">Login now</Link>
        </p>
      </div>
    </div>
  );
};

export default register;
