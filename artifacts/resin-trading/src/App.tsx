import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { CategoryView } from "./pages/CategoryView";
import { TrashView } from "./pages/TrashView";
import { Matches } from "./pages/Matches";

// Keep queries fresh but don't over-fetch
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/"><Redirect to="/virgin" /></Route>
      
      <Route path="/virgin">
        {() => <CategoryView category="virgin" />}
      </Route>
      
      <Route path="/offgrade">
        {() => <CategoryView category="offgrade" />}
      </Route>
      
      <Route path="/recycled">
        {() => <CategoryView category="recycled" />}
      </Route>
      
      <Route path="/trash" component={TrashView} />
      <Route path="/matches" component={Matches} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
