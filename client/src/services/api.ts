import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

const TOKEN_KEY = import.meta.env.VITE_TOKEN_KEY;
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);

    if(token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  },
);

//intercepting response --> if some error will come from backend this interceptor will show all the errors globally ..and we will create one placeholder to show these errors.

//401 --> it means unauthorized ..it means jwt token or token is invalid or expired or there is no token to begin with

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {

    if(error.response?.status === 401){
      localStorage.removeItem(TOKEN_KEY);

      if(!window.location.pathname.includes("/login") && !window.location.pathname.includes("/signup")){
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default api;

