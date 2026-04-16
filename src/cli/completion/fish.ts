export function renderFishCompletionScript(): string {
  return `# fish completion for oc-sessions
function __oc_sessions_candidates
    set -l args (commandline -xpc)
    set -l current (commandline -ct)

    if test -n "$current"
        set args $args $current
    end

    oc __complete $args
end

complete -c oc -f
complete -c oc -a '(__oc_sessions_candidates)'
`;
}
