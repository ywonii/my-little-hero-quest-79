import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import LiteracyTest from "./pages/LiteracyTest";
import DifficultySettings from "./pages/DifficultySettings";
import MainMenu from "./pages/MainMenu";
import MainGame from "./pages/MainGame";
import GamePlay from "./pages/GamePlay";
import AddScenario from "./pages/AddScenario";
import SecretMission from "./pages/SecretMission";
import CustomGamePlay from "./pages/CustomGamePlay";
import WrongAnswers from "./pages/WrongAnswers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/literacy-test" element={<LiteracyTest />} />
          <Route path="/difficulty-settings" element={<DifficultySettings />} />
          <Route path="/main-menu" element={<MainMenu />} />
          <Route path="/main-game" element={<MainGame />} />
          <Route path="/game/:theme" element={<GamePlay />} />
          <Route path="/add-scenario" element={<AddScenario />} />
          <Route path="/secret-mission" element={<SecretMission />} />
          <Route path="/custom-game/:themeName" element={<CustomGamePlay />} />
          <Route path="/wrong-answers" element={<WrongAnswers />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
