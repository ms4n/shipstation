import { useContext } from "react";
import CardContainer from "@/components/CardContainer";
import RecentlyShipped from "@/components/RecentlyShipped";
import { AuthContext } from "@/context/AuthContext";
import useDisclosure from "@/hooks/useDisclosure";
import LoginDialog from "@/components/LoginDialog";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleCardClick = (type) => {
    if (!user) {
      onOpen();
    } else {
      navigate(`/ship?type=${type}`);
    }
  };

  return (
    <div className="flex container flex-col items-center">
      <h1 className="sm:text-4xl font-bold text-white my-8 text-2xl">
        What would you like to ship?
      </h1>
      <CardContainer onCardClick={handleCardClick} />
      <RecentlyShipped />
      <LoginDialog isOpen={isOpen} onClose={onClose} createAccount />
    </div>
  );
};

export default Home;
