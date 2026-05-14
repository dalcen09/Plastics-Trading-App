import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { CategoryView } from "./pages/CategoryView";
import { TrashView } from "./pages/TrashView";
import { Matches } from "./pages/Matches";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Switch>
            <Route path="/"><Redirect to="/offgrade" /></Route>
            <Route path="/offgrade">{() => <CategoryView category="offgrade" />}</Route>
            <Route path="/recycled">{() => <CategoryView category="recycled" />}</Route>
            <Route path="/trash">{() => <TrashView />}</Route>
            <Route path="/matches/:category">{(params) => <Matches category={params.category} />}</Route>
            <Route path="/matches">{() => <Matches />}</Route>
            <Route component={NotFound} />
          </Switch>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
