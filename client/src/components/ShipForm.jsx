import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Fuel, Sparkles, X } from "lucide-react";
import { useSocket } from "@/context/SocketProvider";
import useDisclosure from "@/hooks/useDisclosure";
import ChoosePaymentOptionDialog from "./ChoosePaymentOptionDialog";
import { AuthContext } from "@/context/AuthContext";
import LoaderOverlay from "./LoaderOverlay";
import SuccessOverlay from "./SuccessOverlay";
import useLocalStorage from "@/hooks/useLocalStorage";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { pluralize } from "@/lib/utils";
import { PROMPT_PLACEHOLDERS } from "@/constants";
import LoadingGameOverlay from "./LoadingGameOverlay";

const ShipForm = ({ type, reset }) => {
  const [requirements, setRequirements] = useLocalStorage("requirements", "");
  const { sendMessage, socket } = useSocket();
  const [deployedWebsiteSlug, setDeployedWebsiteSlug] = useState("");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isKeyValidating, setIsKeyValidating] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageUrlError, setImageUrlError] = useState("");

  const navigate = useNavigate();
  const { user, userLoading, availableShips, anthropicKey, setAnthropicKey } =
    useContext(AuthContext);

  const {
    isOpen: isLoaderOpen,
    onOpen: onLoaderOpen,
    onClose: onLoaderClose,
  } = useDisclosure();
  const {
    isOpen: isSuccessOpen,
    onOpen: onSuccessOpen,
    onClose: onSuccessClose,
  } = useDisclosure();

  const startProject = () => {
    const formData = new FormData();
    formData.append("shipType", type);
    formData.append("apiKey", anthropicKey);
    formData.append("message", requirements);

    if (uploadedImage) {
      formData.append("image", uploadedImage);
    } else if (imageUrl) {
      formData.append("imageUrl", imageUrl);
    }

    sendMessage("startProject", formData);
    onClose();
    onLoaderOpen();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!requirements.trim()) {
      toast.info("Easy there, what do you want to make?");
      return;
    }
    if (availableShips <= 0) {
      onOpen();
    } else {
      startProject();
    }
  };

  const handleSubmitAnthropicKey = (apiKey) => {
    sendMessage("anthropicKey", { anthropicKey: apiKey });
    setIsKeyValidating(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedImage(file);
      setImageUrl("");
      setImageUrlError("");
    }
  };

  const handleImageUrlChange = (e) => {
    const url = e.target.value;
    setImageUrl(url);
    setUploadedImage(null);

    // Basic URL validation
    if (url && !url.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i)) {
      setImageUrlError("Please enter a valid image URL");
    } else {
      setImageUrlError("");
    }
  };

  useEffect(() => {
    if (socket) {
      socket.on("apiKeyStatus", (response) => {
        setIsKeyValidating(false);
        if (response.success) {
          startProject();
          toast("Anthropic key is valid, starting generation!");
        } else {
          toast.error(response.message);
        }
      });

      socket.on("showPaymentOptions", ({ error }) => {
        onOpen();
      });

      socket.on("needMoreInfo", ({ message }) => {
        toast("Please add more details regarding the website");
        onLoaderClose();
      });

      socket.on("websiteDeployed", ({ slug }) => {
        onSuccessOpen();
        onLoaderClose();
        setRequirements("");
        setDeployedWebsiteSlug(slug);
      });

      return () => {
        socket.off("apiKeyStatus");
        socket.off("showPaymentOptions");
        socket.off("websiteDeployed");
        socket.off("needMoreInfo");
      };
    }
  }, [socket, anthropicKey, requirements]);

  useEffect(() => {
    if (!userLoading && !user) {
      navigate("/");
    }
  }, [user, userLoading, navigate]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h1 className="sm:text-4xl font-bold text-foreground my-8 text-2xl">
        What would you like to create today?
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col items-center">
        <Textarea
          className="w-full h-60 bg-background text-foreground border-input mb-8"
          placeholder={PROMPT_PLACEHOLDERS[type]}
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
        />
        <div className="w-full mb-4">
          <label className="block text-sm font-medium text-foreground mb-2">
            Image (optional)
          </label>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="file"
                id="image-upload"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={!!imageUrl}
                className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50"
              />
              {uploadedImage && (
                <p className="mt-2 text-sm text-green-500">
                  Image selected: {uploadedImage.name}
                </p>
              )}
            </div>
            <div className="flex-1">
              <input
                type="url"
                placeholder="Or enter image URL"
                value={imageUrl}
                onChange={handleImageUrlChange}
                disabled={!!uploadedImage}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground disabled:opacity-50"
              />
              {imageUrlError && (
                <p className="mt-2 text-sm text-red-500">{imageUrlError}</p>
              )}
              {imageUrl && !imageUrlError && (
                <p className="mt-2 text-sm text-green-500">
                  Valid image URL entered
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row w-full justify-between items-center space-y-4 sm:space-y-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <p
                  className={`text-sm ${
                    availableShips < 1 ? "text-destructive" : "text-foreground"
                  }`}
                  onClick={(e) => e.preventDefault()}
                >
                  <Fuel className="inline-block mr-2" height={18} width={18} />
                  {availableShips} {pluralize(availableShips, "container")}{" "}
                  available
                </p>
              </TooltipTrigger>
              <TooltipContent>
                Your balance is {availableShips}{" "}
                {pluralize(availableShips, "container")}. <br />1 container is
                equal to 1 individual project.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            type="submit"
            className="w-full sm:w-auto transition-all duration-300 bg-primary text-primary-foreground hover:bg-primary/90 group relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-300 ease-in-out bg-shimmer-gradient bg-[length:200%_100%] animate-shimmer" />
            <span className="relative">Start generating website</span>
            <Sparkles className="ml-2 h-4 w-4 group-hover:rotate-180 transition-transform" />
          </Button>
        </div>
      </form>
      <ChoosePaymentOptionDialog
        isOpen={isOpen}
        onClose={onClose}
        onSubmitKey={handleSubmitAnthropicKey}
        anthropicKey={anthropicKey}
        setAnthropicKey={setAnthropicKey}
        type={type}
        isKeyValidating={isKeyValidating}
      />
      {isLoaderOpen && <LoadingGameOverlay isOpen={isLoaderOpen} type={type} />}
      <SuccessOverlay
        isOpen={isSuccessOpen}
        onClose={reset}
        slug={deployedWebsiteSlug}
      />
    </div>
  );
};

export default ShipForm;
