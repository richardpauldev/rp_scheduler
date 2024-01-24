def find_pairings(agents):
    pairings = {}
    for day in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]:
        available_agents = [agent for agent in agents if day in agents[agent]["available_days"]]
        paired = set()

        for agent in available_agents:
            if agent not in paired:
                for potential_partner in available_agents:
                    if potential_partner not in paired and potential_partner != agent:
                        if potential_partner not in agents[agent]["cannot_pair_with"]:
                            # Pair found
                            pairings.setdefault(day, []).append((agent, potential_partner))
                            paired.update([agent, potential_partner])
                            break

    return pairings

# Example usage
agents = {
    "Agent1": {"available_days": ["Monday", "Tuesday"], "cannot_pair_with": ["Agent3"]},
    "Agent2": {"available_days": ["Monday", "Wednesday"], "cannot_pair_with": []},
    "Agent3": {"available_days": ["Tuesday"], "cannot_pair_with": ["Agent1"]}
}

find_pairings(agents)